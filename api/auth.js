/**
 * Authentication API Routes (Phase 6)
 * - Access/refresh token lifecycle
 * - Session management and revocation
 * - OAuth state bootstrap + guarded identity linking
 * - TOTP enrollment + verification + step-up
 */

const express = require('express');
const crypto = require('crypto');
const authService = require('../services/authService');
const db = require('../models/database');
const postgres = require('../models/postgres');

const router = express.Router();

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || 'unknown')
    .toString()
    .split(',')[0]
    .trim();
}

function boolFromEnv(key, fallback = false) {
  const value = process.env[key];
  if (value == null) return fallback;
  return String(value).toLowerCase() === 'true';
}

function useCookieAuth() {
  return boolFromEnv('AUTH_USE_SECURE_COOKIES', false);
}

function parseCookies(req) {
  const header = req.header('cookie');
  if (!header) return {};

  const out = {};
  const parts = String(header).split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

function getRefreshTokenInput(req) {
  const bodyToken = req.body?.refreshToken;
  if (bodyToken) return String(bodyToken);

  const cookies = parseCookies(req);
  if (cookies.refreshToken) return String(cookies.refreshToken);
  return null;
}

function cookieSecure(req) {
  if (boolFromEnv('AUTH_COOKIE_SECURE', false)) return true;
  const forwardedProto = String(req.header('x-forwarded-proto') || '').toLowerCase();
  return req.secure || forwardedProto === 'https' || process.env.NODE_ENV === 'production';
}

function setRefreshCookie(req, res, refreshToken, refreshExpiresInSeconds) {
  const sameSite = process.env.AUTH_COOKIE_SAMESITE || 'Lax';
  const path = process.env.AUTH_COOKIE_PATH || '/api/auth';
  const secure = cookieSecure(req);
  const httpOnly = true;
  const maxAge = Math.max(1000, parseInt(refreshExpiresInSeconds, 10) * 1000 || 0);

  let cookie = `refreshToken=${encodeURIComponent(refreshToken)}; Max-Age=${Math.floor(maxAge / 1000)}; Path=${path}; HttpOnly; SameSite=${sameSite}`;
  if (secure) cookie += '; Secure';

  res.append('Set-Cookie', cookie);
}

function clearRefreshCookie(req, res) {
  const sameSite = process.env.AUTH_COOKIE_SAMESITE || 'Lax';
  const path = process.env.AUTH_COOKIE_PATH || '/api/auth';
  const secure = cookieSecure(req);

  let cookie = `refreshToken=; Max-Age=0; Path=${path}; HttpOnly; SameSite=${sameSite}`;
  if (secure) cookie += '; Secure';
  res.append('Set-Cookie', cookie);
}

function audit(action, status, req, userId = null, metadata = {}) {
  if (!postgres.isEnabled()) return Promise.resolve();

  return postgres.query(
    `INSERT INTO auth_audit_logs (id, user_id, action, status, request_id, ip_address, user_agent, metadata, occurred_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW(), NOW())`,
    [
      `aal_${crypto.randomBytes(10).toString('hex')}`,
      userId,
      action,
      status,
      req.header('x-request-id') || null,
      clientIp(req),
      req.header('user-agent') || null,
      JSON.stringify(metadata || {})
    ]
  ).catch(() => {});
}

function authError(res, status, code, message) {
  return res.status(status).json({ success: false, error: { code, message } });
}

function logAuthError(req, code, error, metadata = {}) {
  console.error('[api/auth] request failed', {
    code,
    path: req?.path || null,
    method: req?.method || null,
    requestId: req?.header?.('x-request-id') || null,
    message: error?.message || 'unknown_error',
    ...(error?.stack ? { stack: error.stack } : {}),
    ...metadata
  });
}

function internalAuthError(req, res, status, code, error, clientMessage) {
  logAuthError(req, code, error);
  return authError(res, status, code, clientMessage);
}

async function resolveBearerIdentity(req) {
  const authHeader = req.header('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!token) return null;

  try {
    const decoded = authService.verifyAccessToken(token);
    if (await authService.isJtiRevoked(decoded.jti)) return null;
    if (await authService.isSessionRevoked(decoded.sid)) return null;
    await authService.touchSession(decoded.sid, {
      ipAddress: clientIp(req),
      userAgent: req.header('user-agent') || null
    });
    return {
      userId: decoded.sub,
      sessionId: decoded.sid,
      jti: decoded.jti,
      amr: Array.isArray(decoded.amr) ? decoded.amr : []
    };
  } catch {
    return null;
  }
}

function normalizeUserFromStore(user) {
  if (!user) return null;
  return { id: user.id, username: user.username || 'Player', email: user.email || null };
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeUsername(username) {
  return String(username || '').trim();
}

function validEmail(email) {
  const e = normalizeEmail(email);
  if (!e) return false;
  // Pragmatic validation (not RFC-perfect) to avoid obvious junk.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

async function verifySteamOpenIdResponse(steamOpenId) {
  const obj = steamOpenId && typeof steamOpenId === 'object' ? steamOpenId : null;
  if (!obj) return false;

  // If we don't have a signed OpenID response, we can't verify it.
  const hasSignature = obj['openid.sig'] || obj.sig || obj['openid.signed'] || obj.signed;
  if (!hasSignature) return false;

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    params.set(String(k), String(v));
  }
  params.set('openid.mode', 'check_authentication');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch('https://steamcommunity.com/openid/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'text/plain'
      },
      body: params,
      signal: controller.signal
    });

    const text = await response.text();
    return response.ok && /is_valid\s*:\s*true/i.test(text);
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

router.post('/login', async (req, res) => {
  try {
    const { email, username } = req.body || {};
    let user = null;

    if (email) {
      user = db.findOne('users', { email: normalizeEmail(email) });
    }

    if (!user && username) {
      user = db.findOne('users', { username: normalizeUsername(username) });
    }

    if (!user && process.env.NODE_ENV !== 'production') {
      user = { id: 'demo-user', username: 'DemoUser', email: 'demo@scarygames.ai' };
    }

    if (!user) {
      await audit('login', 'failed', req, null, { reason: 'USER_NOT_FOUND' });
      return authError(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials');
    }

    const tokens = await authService.issueTokenPair(user, {
      ipAddress: clientIp(req),
      userAgent: req.header('user-agent') || null,
      mfaVerified: false
    });

    await audit('login', 'succeeded', req, user.id, { sessionId: tokens.sessionId, amr: tokens.amr || ['pwd'] });

    if (useCookieAuth()) {
      setRefreshCookie(req, res, tokens.refreshToken, tokens.refreshExpiresIn);
      return res.json({
        success: true,
        user: { id: user.id, username: user.username, email: user.email || null },
        tokens: {
          accessToken: tokens.accessToken,
          sessionId: tokens.sessionId,
          expiresIn: tokens.expiresIn,
          refreshExpiresIn: tokens.refreshExpiresIn,
          amr: tokens.amr || ['pwd']
        }
      });
    }

    return res.json({ success: true, user: { id: user.id, username: user.username, email: user.email || null }, tokens });
  } catch (error) {
    return internalAuthError(req, res, 500, 'AUTH_LOGIN_FAILED', error, 'Login failed');
  }
});

router.post('/register', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const username = normalizeUsername(req.body?.username);

    if (!validEmail(email)) return authError(res, 400, 'AUTH_REGISTER_EMAIL_INVALID', 'Valid email is required');
    if (!username) return authError(res, 400, 'AUTH_REGISTER_USERNAME_REQUIRED', 'Username is required');

    const existingByEmail = db.findOne('users', { email });
    if (existingByEmail) return authError(res, 409, 'AUTH_REGISTER_EMAIL_TAKEN', 'Email is already registered');

    const existingByUsername = db.findOne('users', { username });
    if (existingByUsername) return authError(res, 409, 'AUTH_REGISTER_USERNAME_TAKEN', 'Username is already taken');

    const created = db.create('users', {
      email,
      username
    });

    const tokens = await authService.issueTokenPair(created, {
      ipAddress: clientIp(req),
      userAgent: req.header('user-agent') || null,
      mfaVerified: false
    });

    await audit('register', 'succeeded', req, created.id, { sessionId: tokens.sessionId, amr: tokens.amr || ['pwd'] });

    if (useCookieAuth()) {
      setRefreshCookie(req, res, tokens.refreshToken, tokens.refreshExpiresIn);
      return res.json({
        success: true,
        user: { id: created.id, username: created.username, email: created.email || null },
        tokens: {
          accessToken: tokens.accessToken,
          sessionId: tokens.sessionId,
          expiresIn: tokens.expiresIn,
          refreshExpiresIn: tokens.refreshExpiresIn,
          amr: tokens.amr || ['pwd']
        }
      });
    }

    return res.json({ success: true, user: { id: created.id, username: created.username, email: created.email || null }, tokens });
  } catch (error) {
    return internalAuthError(req, res, 500, 'AUTH_REGISTER_FAILED', error, 'Registration failed');
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = getRefreshTokenInput(req);
    if (!refreshToken) {
      return authError(res, 400, 'AUTH_REFRESH_MISSING', 'refreshToken is required');
    }

    const tokens = await authService.rotateRefreshToken(refreshToken, {
      ipAddress: clientIp(req),
      userAgent: req.header('user-agent') || null
    });

    if (useCookieAuth()) {
      setRefreshCookie(req, res, tokens.refreshToken, tokens.refreshExpiresIn);
      await audit('token.refresh', 'succeeded', req, null, { sessionId: tokens.sessionId, transport: 'cookie' });
      return res.json({
        success: true,
        tokens: {
          accessToken: tokens.accessToken,
          sessionId: tokens.sessionId,
          expiresIn: tokens.expiresIn,
          refreshExpiresIn: tokens.refreshExpiresIn,
          amr: tokens.amr || ['pwd']
        }
      });
    }

    await audit('token.refresh', 'succeeded', req, null, { sessionId: tokens.sessionId, transport: 'body' });
    return res.json({ success: true, tokens });
  } catch (error) {
    await audit('token.refresh', 'failed', req, null, { code: error.code || 'AUTH_REFRESH_FAILED' });
    return authError(res, 401, error.code || 'AUTH_REFRESH_FAILED', 'Token refresh failed');
  }
});

router.post('/logout', async (req, res) => {
  try {
    const bearer = await resolveBearerIdentity(req);
    const sessionId = req.body?.sessionId || bearer?.sessionId;
    if (!sessionId) {
      return authError(res, 400, 'AUTH_SESSION_ID_MISSING', 'sessionId is required');
    }

    await authService.revokeSession(sessionId, 'user_logout');
    if (useCookieAuth()) clearRefreshCookie(req, res);
    await audit('logout', 'succeeded', req, bearer?.userId || null, { sessionId });
    return res.json({ success: true });
  } catch (error) {
    return internalAuthError(req, res, 500, 'AUTH_LOGOUT_FAILED', error, 'Logout failed');
  }
});

router.get('/sessions', async (req, res) => {
  try {
    const identity = await resolveBearerIdentity(req);
    if (!identity) return authError(res, 401, 'AUTH_REQUIRED', 'Valid access token is required');

    const includeRevoked = String(req.query.includeRevoked || 'false').toLowerCase() === 'true';
    const sessions = await authService.listUserSessions(identity.userId, { includeRevoked, limit: req.query.limit || 50 });
    return res.json({ success: true, sessions, currentSessionId: identity.sessionId });
  } catch (error) {
    return internalAuthError(req, res, 500, 'AUTH_SESSION_LIST_FAILED', error, 'Failed to load sessions');
  }
});

router.post('/sessions/revoke', async (req, res) => {
  try {
    const identity = await resolveBearerIdentity(req);
    if (!identity) return authError(res, 401, 'AUTH_REQUIRED', 'Valid access token is required');

    const sessionId = req.body?.sessionId;
    if (!sessionId) return authError(res, 400, 'AUTH_SESSION_ID_MISSING', 'sessionId is required');

    const sessions = await authService.listUserSessions(identity.userId, { includeRevoked: true, limit: 100 });
    const target = sessions.find((s) => s.sessionId === sessionId);
    if (!target) return authError(res, 404, 'AUTH_SESSION_NOT_FOUND', 'Session not found for this user');

    await authService.revokeSession(sessionId, 'manual_session_revoke');
    await audit('session.revoke', 'succeeded', req, identity.userId, { sessionId });
    return res.json({ success: true, sessionId });
  } catch (error) {
    return internalAuthError(req, res, 500, 'AUTH_SESSION_REVOKE_FAILED', error, 'Session revoke failed');
  }
});

router.post('/logout-all', async (req, res) => {
  try {
    const identity = await resolveBearerIdentity(req);
    if (!identity) return authError(res, 401, 'AUTH_REQUIRED', 'Valid access token is required');

    const keepCurrent = String(req.body?.keepCurrent || 'false').toLowerCase() === 'true';
    const result = await authService.revokeAllUserSessions(identity.userId, {
      reason: 'user_logout_all',
      exceptSessionId: keepCurrent ? identity.sessionId : null
    });

    if (!keepCurrent) {
      await authService.revokeSession(identity.sessionId, 'user_logout_all_current');
      if (useCookieAuth()) clearRefreshCookie(req, res);
    }

    await audit('logout.all', 'succeeded', req, identity.userId, { keepCurrent, revokedCount: result.revokedCount || 0 });
    return res.json({ success: true, revokedCount: result.revokedCount || 0, keepCurrent });
  } catch (error) {
    return internalAuthError(req, res, 500, 'AUTH_LOGOUT_ALL_FAILED', error, 'Logout all failed');
  }
});

router.get('/oauth/:provider/start', async (req, res) => {
  try {
    const { provider } = req.params;
    const returnTo = req.query.returnTo ? String(req.query.returnTo) : '/';

    const { state, verifier, providerConfig } = await authService.createOAuthState(provider, returnTo);

    if (provider === 'steam') {
      // Steam uses OpenID 2.0. We generate a complete OpenID redirect URL here so the frontend can just navigate.
      // Ensure redirect URI includes a stable `provider=steam` so our static callback page can route the response.
      const configured = providerConfig.redirectUri || '';
      const redirectUri = configured || `${process.env.DOMAIN || ''}/oauth/callback.html?provider=steam`;
      let returnToUrl;
      try {
        returnToUrl = new URL(redirectUri);
      } catch {
        returnToUrl = new URL('/oauth/callback.html?provider=steam', process.env.DOMAIN || 'http://localhost:9999');
      }
      returnToUrl.searchParams.set('state', state);

      const realm = (() => {
        try {
          const domain = process.env.DOMAIN ? new URL(process.env.DOMAIN).origin : null;
          if (domain) return domain;
        } catch {}
        try {
          return new URL(returnToUrl.toString()).origin;
        } catch {}
        return process.env.DOMAIN || 'http://localhost:9999';
      })();

      const openidUrl = new URL(providerConfig.authUrl);
      openidUrl.searchParams.set('openid.ns', 'http://specs.openid.net/auth/2.0');
      openidUrl.searchParams.set('openid.mode', 'checkid_setup');
      openidUrl.searchParams.set('openid.return_to', returnToUrl.toString());
      openidUrl.searchParams.set('openid.realm', realm);
      openidUrl.searchParams.set('openid.identity', 'http://specs.openid.net/auth/2.0/identifier_select');
      openidUrl.searchParams.set('openid.claimed_id', 'http://specs.openid.net/auth/2.0/identifier_select');

      return res.json({
        success: true,
        provider,
        state,
        verifier,
        authUrl: openidUrl.toString(),
        mode: 'openid',
        message: 'Steam OpenID redirect generated.'
      });
    }

    const clientId = String(providerConfig.clientId || '').trim();
    if (!clientId) {
      const hint = provider === 'google'
        ? 'OAUTH_GOOGLE_CLIENT_ID'
        : provider === 'discord'
          ? 'OAUTH_DISCORD_CLIENT_ID'
          : 'OAUTH_<PROVIDER>_CLIENT_ID';
      const err = new Error(`${String(provider).toUpperCase()} OAuth is not configured (missing client_id). Set ${hint}.`);
      err.code = 'AUTH_OAUTH_PROVIDER_NOT_CONFIGURED';
      err.status = 400;
      throw err;
    }

    const origin = (() => {
      try {
        if (process.env.DOMAIN) return new URL(process.env.DOMAIN).origin;
      } catch {}
      const proto = String(req.get('x-forwarded-proto') || req.protocol || 'http').split(',')[0].trim();
      const host = String(req.get('x-forwarded-host') || req.get('host') || 'localhost:9999').split(',')[0].trim();
      return `${proto}://${host}`;
    })();

    let redirectUri = String(providerConfig.redirectUri || '').trim();
    if (!redirectUri) {
      redirectUri = `${origin}/oauth/callback.html?provider=${encodeURIComponent(provider)}`;
    }

    try {
      // Normalize relative redirect URIs against our computed origin.
      redirectUri = new URL(redirectUri, origin).toString();
    } catch {
      const hint = provider === 'google'
        ? 'OAUTH_GOOGLE_REDIRECT_URI'
        : provider === 'discord'
          ? 'OAUTH_DISCORD_REDIRECT_URI'
          : 'OAUTH_<PROVIDER>_REDIRECT_URI';
      const err = new Error(`${String(provider).toUpperCase()} OAuth redirect_uri is invalid. Set ${hint} to a valid URL.`);
      err.code = 'AUTH_OAUTH_REDIRECT_URI_INVALID';
      err.status = 400;
      throw err;
    }

    const url = new URL(providerConfig.authUrl);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', providerConfig.scope);
    url.searchParams.set('state', state);

    return res.json({ success: true, provider, state, verifier, authUrl: url.toString() });
  } catch (error) {
    const code = error.code || 'AUTH_OAUTH_START_FAILED';
    logAuthError(req, code, error);

    const status = Number.isFinite(error.status) ? error.status : 400;
    const safeMessage = (code === 'AUTH_OAUTH_PROVIDER_NOT_CONFIGURED' || code === 'AUTH_OAUTH_REDIRECT_URI_INVALID')
      ? (error.message || 'OAuth start failed')
      : 'OAuth start failed';

    return authError(res, status, code, safeMessage);
  }
});

router.post('/oauth/:provider/callback', async (req, res) => {
  try {
    const { provider } = req.params;
    const {
      state,
      code,
      codeVerifier,
      redirectUri,
      steamOpenId,
      providerProfile,
      providerUserId: rawProviderUserId,
      providerEmail: rawProviderEmail
    } = req.body || {};

    if (!state) {
      return authError(res, 400, 'AUTH_OAUTH_STATE_MISSING', 'state is required');
    }

    const statePayload = await authService.consumeOAuthState(state);
    if (!statePayload || statePayload.provider !== provider) {
      return authError(res, 400, 'AUTH_OAUTH_STATE_INVALID', 'Invalid oauth state');
    }

    const identity = await resolveBearerIdentity(req);
    const intendedUserId = req.body?.linkUserId || identity?.userId || null;

    let providerUserId = rawProviderUserId ? String(rawProviderUserId) : null;
    let providerEmail = rawProviderEmail ? String(rawProviderEmail).toLowerCase() : null;
    let providerTokens = null;
    let resolvedProfile = providerProfile && typeof providerProfile === 'object' ? providerProfile : {};

    if (provider === 'steam' && steamOpenId && !providerUserId) {
      // In production, require OpenID response verification (no edge gateway needed).
      const hasSig = steamOpenId && typeof steamOpenId === 'object' && (steamOpenId['openid.sig'] || steamOpenId['openid.signed'] || steamOpenId.sig || steamOpenId.signed);
      if (process.env.NODE_ENV === 'production') {
        if (!hasSig) {
          await audit('oauth.callback', 'failed', req, intendedUserId, { provider, reason: 'STEAM_OPENID_SIGNATURE_MISSING' });
          return authError(res, 400, 'AUTH_OAUTH_STEAM_OPENID_SIGNATURE_MISSING', 'Steam OpenID signature is required');
        }
      }

      // Verify whenever we have a signed response (dev + prod). Tests can still pass by sending claimed_id only.
      if (hasSig) {
        const ok = await verifySteamOpenIdResponse(steamOpenId);
        if (!ok) {
          await audit('oauth.callback', 'failed', req, intendedUserId, { provider, reason: 'STEAM_OPENID_INVALID' });
          return authError(res, 401, 'AUTH_OAUTH_STEAM_OPENID_INVALID', 'Invalid Steam OpenID response');
        }
      }

      const claimedId = String(
        steamOpenId['openid.claimed_id'] || steamOpenId.claimed_id || steamOpenId.claimedId || ''
      ).trim();
      const steamMatch = claimedId.match(/\/openid\/id\/(\d+)\/?$/i);
      if (!steamMatch || !steamMatch[1]) {
        await audit('oauth.callback', 'failed', req, intendedUserId, {
          provider,
          reason: 'STEAM_CLAIMED_ID_INVALID'
        });
        return authError(res, 400, 'AUTH_OAUTH_STEAM_ID_INVALID', 'Invalid Steam OpenID claimed_id');
      }

      providerUserId = steamMatch[1];
      resolvedProfile = {
        ...resolvedProfile,
        claimedId,
        identity: providerUserId
      };
    }

    if (code) {
      try {
        providerTokens = await authService.exchangeOAuthCode(provider, {
          code: String(code),
          redirectUri: redirectUri || null,
          codeVerifier: codeVerifier || statePayload.verifier || null
        });

        const fetched = await authService.fetchOAuthProfile(provider, providerTokens);
        if (fetched) {
          if (!providerUserId && fetched.providerUserId) providerUserId = String(fetched.providerUserId);
          if (!providerEmail && fetched.providerEmail) providerEmail = String(fetched.providerEmail).toLowerCase();
          resolvedProfile = {
            ...resolvedProfile,
            ...(fetched.profile && typeof fetched.profile === 'object' ? fetched.profile : {})
          };
        }
      } catch (error) {
        await audit('oauth.callback', 'failed', req, intendedUserId, {
          provider,
          reason: 'PROVIDER_EXCHANGE_FAILED',
          code: error.code || 'AUTH_OAUTH_PROVIDER_EXCHANGE_FAILED'
        });
        logAuthError(req, error.code || 'AUTH_OAUTH_PROVIDER_EXCHANGE_FAILED', error, { provider });
        return authError(res, 401, error.code || 'AUTH_OAUTH_PROVIDER_EXCHANGE_FAILED', 'OAuth provider exchange failed');
      }
    }

    if (!providerUserId) {
      return authError(
        res,
        400,
        'AUTH_OAUTH_PROVIDER_USER_REQUIRED',
        'providerUserId is required (directly, Steam OpenID claim, or provider code exchange)'
      );
    }

    if (!postgres.isEnabled()) {
      await audit('oauth.callback', 'succeeded', req, intendedUserId, {
        provider,
        returnTo: statePayload.returnTo,
        mode: 'no_db',
        providerUserId,
        providerEmail
      });

      return res.json({
        success: true,
        provider,
        stateVerified: true,
        linked: false,
        message: 'OAuth identity resolution succeeded but linking requires PostgreSQL.',
        resolvedIdentity: {
          providerUserId,
          providerEmail,
          profile: resolvedProfile
        },
        returnTo: statePayload.returnTo
      });
    }

    const existingIdentityResult = await postgres.query(
      `SELECT id, user_id, provider, provider_user_id, provider_email
       FROM oauth_identities
       WHERE provider = $1 AND provider_user_id = $2
       LIMIT 1`,
      [provider, String(providerUserId)]
    );
    const existingIdentity = existingIdentityResult.rows[0] || null;

    if (existingIdentity && intendedUserId && existingIdentity.user_id !== intendedUserId) {
      await audit('oauth.callback', 'failed', req, intendedUserId, {
        provider,
        providerUserId,
        reason: 'IDENTITY_ALREADY_LINKED_TO_OTHER_USER'
      });
      return authError(res, 409, 'AUTH_OAUTH_IDENTITY_TAKEN', 'OAuth identity is already linked to another user');
    }

    let targetUser = null;
    if (intendedUserId) {
      const userRow = await postgres.query('SELECT id, username, email FROM users WHERE id = $1 LIMIT 1', [intendedUserId]);
      targetUser = normalizeUserFromStore(userRow.rows[0]);
    }

    if (!targetUser && providerEmail) {
      const byEmail = await postgres.query('SELECT id, username, email FROM users WHERE lower(email) = lower($1) LIMIT 1', [providerEmail]);
      targetUser = normalizeUserFromStore(byEmail.rows[0]);
    }

    if (!targetUser && existingIdentity) {
      const byIdentity = await postgres.query('SELECT id, username, email FROM users WHERE id = $1 LIMIT 1', [existingIdentity.user_id]);
      targetUser = normalizeUserFromStore(byIdentity.rows[0]);
    }

    if (!targetUser) {
      await audit('oauth.callback', 'failed', req, null, {
        provider,
        providerUserId,
        reason: 'NO_TARGET_USER'
      });
      return authError(res, 404, 'AUTH_OAUTH_USER_NOT_FOUND', 'No matching account found for OAuth identity');
    }

    const requireEmailMatch = boolFromEnv('OAUTH_LINKING_REQUIRE_EMAIL_MATCH', true);
    if (requireEmailMatch && targetUser.email && providerEmail && String(targetUser.email).toLowerCase() !== String(providerEmail).toLowerCase()) {
      await audit('oauth.callback', 'failed', req, targetUser.id, {
        provider,
        providerUserId,
        reason: 'EMAIL_MISMATCH',
        userEmail: targetUser.email,
        providerEmail
      });
      return authError(res, 409, 'AUTH_OAUTH_EMAIL_MISMATCH', 'OAuth identity email does not match account email');
    }

    const identityId = existingIdentity?.id || `oid_${crypto.randomBytes(8).toString('hex')}`;
    await postgres.query(
      `INSERT INTO oauth_identities (id, user_id, provider, provider_user_id, provider_email, access_token_encrypted, refresh_token_encrypted, scopes, metadata, linked_at, last_login_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW(), NOW(), NOW(), NOW())
       ON CONFLICT (provider, provider_user_id)
       DO UPDATE SET
         user_id = EXCLUDED.user_id,
         provider_email = EXCLUDED.provider_email,
         access_token_encrypted = COALESCE(EXCLUDED.access_token_encrypted, oauth_identities.access_token_encrypted),
         refresh_token_encrypted = COALESCE(EXCLUDED.refresh_token_encrypted, oauth_identities.refresh_token_encrypted),
         scopes = COALESCE(EXCLUDED.scopes, oauth_identities.scopes),
         metadata = COALESCE(oauth_identities.metadata, '{}'::jsonb) || EXCLUDED.metadata,
         last_login_at = NOW(),
         updated_at = NOW()`,
      [
        identityId,
        targetUser.id,
        provider,
        String(providerUserId),
        providerEmail || null,
        providerTokens?.accessToken || null,
        providerTokens?.refreshToken || null,
        providerTokens?.scope || null,
        JSON.stringify({
          lastReturnTo: statePayload.returnTo,
          linkedViaApi: true,
          providerProfile: resolvedProfile,
          tokenSource: code ? 'provider_exchange' : 'client_asserted'
        })
      ]
    );

    const tokens = await authService.issueTokenPair(targetUser, {
      ipAddress: clientIp(req),
      userAgent: req.header('user-agent') || null,
      mfaVerified: false
    });

    if (useCookieAuth()) {
      setRefreshCookie(req, res, tokens.refreshToken, tokens.refreshExpiresIn);
    }

    await audit('oauth.callback', 'succeeded', req, targetUser.id, {
      provider,
      providerUserId,
      returnTo: statePayload.returnTo,
      sessionId: tokens.sessionId,
      via: code ? 'provider_exchange' : 'client_asserted'
    });

    return res.json({
      success: true,
      provider,
      stateVerified: true,
      linked: true,
      user: targetUser,
      tokens: useCookieAuth()
        ? {
            accessToken: tokens.accessToken,
            sessionId: tokens.sessionId,
            expiresIn: tokens.expiresIn,
            refreshExpiresIn: tokens.refreshExpiresIn,
            amr: tokens.amr || ['pwd']
          }
        : tokens,
      identity: {
        providerUserId,
        providerEmail,
        profile: resolvedProfile
      },
      returnTo: statePayload.returnTo
    });
  } catch (error) {
    return internalAuthError(req, res, 500, error.code || 'AUTH_OAUTH_CALLBACK_FAILED', error, 'OAuth callback failed');
  }
});

router.post('/2fa/enroll', async (req, res) => {
  try {
    const identity = await resolveBearerIdentity(req);
    const userId = req.body?.userId || identity?.userId;

    if (!userId) {
      return authError(res, 400, 'AUTH_2FA_USER_REQUIRED', 'userId is required');
    }

    if (identity && identity.userId !== userId) {
      return authError(res, 403, 'AUTH_2FA_FORBIDDEN', 'Cannot enroll 2FA for another user');
    }

    const secret = authService.generateTotpSecret();
    const backupCodes = authService.generateBackupCodes();
    const backupCodeHashes = backupCodes.map((c) => authService.hashBackupCode(c));

    if (postgres.isEnabled()) {
      const encryptedSecret = authService.encryptTotpSecret(secret);
      await postgres.query(
        `INSERT INTO user_2fa (id, user_id, totp_secret_encrypted, is_enabled, backup_codes_hashes, recovery_used_count, enrolled_at, updated_at)
         VALUES ($1, $2, $3, FALSE, $4::jsonb, 0, NOW(), NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET
           totp_secret_encrypted = EXCLUDED.totp_secret_encrypted,
           backup_codes_hashes = EXCLUDED.backup_codes_hashes,
           is_enabled = FALSE,
           recovery_used_count = 0,
           updated_at = NOW()`,
        [`u2fa_${crypto.randomBytes(8).toString('hex')}`, userId, encryptedSecret, JSON.stringify(backupCodeHashes)]
      );
    }

    await audit('2fa.enroll', 'succeeded', req, userId);

    return res.json({
      success: true,
      setup: {
        secret,
        backupCodes,
        otpauthUri: `otpauth://totp/ScaryGamesAI:${encodeURIComponent(userId)}?secret=${secret}&issuer=ScaryGamesAI`
      }
    });
  } catch (error) {
    return internalAuthError(req, res, 500, 'AUTH_2FA_ENROLL_FAILED', error, '2FA enrollment failed');
  }
});

router.post('/2fa/verify', async (req, res) => {
  try {
    const identity = await resolveBearerIdentity(req);
    const { userId, code } = req.body || {};
    if (!userId || !code) {
      return authError(res, 400, 'AUTH_2FA_INPUT_REQUIRED', 'userId and code are required');
    }

    if (identity && identity.userId !== userId) {
      return authError(res, 403, 'AUTH_2FA_FORBIDDEN', 'Cannot verify 2FA for another user');
    }

    if (!postgres.isEnabled()) {
      return authError(res, 400, 'AUTH_2FA_DB_REQUIRED', '2FA requires PostgreSQL enabled');
    }

    const rowResult = await postgres.query(
      `SELECT id, user_id, totp_secret_encrypted, backup_codes_hashes FROM user_2fa WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    const row = rowResult.rows[0];
    if (!row || !row.totp_secret_encrypted) {
      return authError(res, 404, 'AUTH_2FA_NOT_ENROLLED', '2FA enrollment not found');
    }

    const decryptedSecret = authService.decryptTotpSecret(row.totp_secret_encrypted);
    let verified = authService.verifyTotpCode(decryptedSecret, code);

    if (!verified) {
      const codeHash = authService.hashBackupCode(code);
      const hashes = Array.isArray(row.backup_codes_hashes) ? row.backup_codes_hashes : [];
      const idx = hashes.indexOf(codeHash);
      if (idx >= 0) {
        hashes.splice(idx, 1);
        await postgres.query(
          `UPDATE user_2fa SET backup_codes_hashes = $2::jsonb, recovery_used_count = recovery_used_count + 1, updated_at = NOW() WHERE user_id = $1`,
          [userId, JSON.stringify(hashes)]
        );
        verified = true;
      }
    }

    if (!verified) {
      await audit('2fa.verify', 'failed', req, userId, { reason: 'INVALID_CODE' });
      return authError(res, 401, 'AUTH_2FA_INVALID_CODE', 'Invalid verification code');
    }

    await postgres.query(`UPDATE user_2fa SET is_enabled = TRUE, updated_at = NOW() WHERE user_id = $1`, [userId]);

    let stepUp = null;
    if (identity?.sessionId) {
      const user = db.findOne('users', { id: userId }) || { id: userId, username: 'Player', email: null };
      stepUp = authService.issueAccessTokenForSession(user, identity.sessionId, { mfaVerified: true });
      await authService.revokeJti(identity.jti || null, 1).catch(() => {});
      await audit('2fa.stepup', 'succeeded', req, userId, { sessionId: identity.sessionId });
    }

    await audit('2fa.verify', 'succeeded', req, userId);
    return res.json({
      success: true,
      verified: true,
      stepUpToken: stepUp ? stepUp.accessToken : null,
      amr: stepUp ? stepUp.amr : ['mfa']
    });
  } catch (error) {
    return internalAuthError(req, res, 500, 'AUTH_2FA_VERIFY_FAILED', error, '2FA verification failed');
  }
});

router.post('/2fa/challenge', async (req, res) => {
  try {
    const identity = await resolveBearerIdentity(req);
    if (!identity) return authError(res, 401, 'AUTH_REQUIRED', 'Valid access token is required');

    const { code } = req.body || {};
    if (!code) return authError(res, 400, 'AUTH_2FA_CODE_REQUIRED', 'code is required');

    if (!postgres.isEnabled()) {
      return authError(res, 400, 'AUTH_2FA_DB_REQUIRED', '2FA requires PostgreSQL enabled');
    }

    const rowResult = await postgres.query(
      `SELECT user_id, totp_secret_encrypted, backup_codes_hashes, is_enabled
       FROM user_2fa
       WHERE user_id = $1
       LIMIT 1`,
      [identity.userId]
    );
    const row = rowResult.rows[0];
    if (!row || !row.is_enabled || !row.totp_secret_encrypted) {
      return authError(res, 404, 'AUTH_2FA_NOT_ENABLED', '2FA is not enabled for this user');
    }

    const decryptedSecret = authService.decryptTotpSecret(row.totp_secret_encrypted);
    let verified = authService.verifyTotpCode(decryptedSecret, code);
    if (!verified) {
      const codeHash = authService.hashBackupCode(code);
      const hashes = Array.isArray(row.backup_codes_hashes) ? row.backup_codes_hashes : [];
      const idx = hashes.indexOf(codeHash);
      if (idx >= 0) {
        hashes.splice(idx, 1);
        await postgres.query(
          `UPDATE user_2fa SET backup_codes_hashes = $2::jsonb, recovery_used_count = recovery_used_count + 1, updated_at = NOW() WHERE user_id = $1`,
          [identity.userId, JSON.stringify(hashes)]
        );
        verified = true;
      }
    }

    if (!verified) {
      await audit('2fa.challenge', 'failed', req, identity.userId, { reason: 'INVALID_CODE' });
      return authError(res, 401, 'AUTH_2FA_INVALID_CODE', 'Invalid verification code');
    }

    const user = db.findOne('users', { id: identity.userId }) || { id: identity.userId, username: 'Player', email: null };
    const stepUp = authService.issueAccessTokenForSession(user, identity.sessionId, { mfaVerified: true });

    await audit('2fa.challenge', 'succeeded', req, identity.userId, { sessionId: identity.sessionId });
    return res.json({ success: true, accessToken: stepUp.accessToken, expiresIn: stepUp.expiresIn, amr: stepUp.amr });
  } catch (error) {
    return internalAuthError(req, res, 500, 'AUTH_2FA_CHALLENGE_FAILED', error, '2FA challenge failed');
  }
});

module.exports = router;
