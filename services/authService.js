/**
 * Production-oriented auth service with JWT access/refresh tokens,
 * Redis-backed sessions, revocation, OAuth state helpers, and TOTP 2FA.
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const cacheService = require('./cacheService');
const postgres = require('../models/postgres');

const OAUTH_HTTP_TIMEOUT_MS = Math.max(1000, parseInt(process.env.OAUTH_HTTP_TIMEOUT_MS || '10000', 10));
const SESSION_TOUCH_MIN_INTERVAL_SECONDS = Math.max(5, parseInt(process.env.AUTH_SESSION_TOUCH_MIN_INTERVAL_SECONDS || '30', 10));
const TOTP_ENCRYPTION_CONTEXT = 'sgai:totp:v1';

const ACCESS_TOKEN_TTL_SECONDS = parseInt(process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS || '900', 10); // 15m
const REFRESH_TOKEN_TTL_SECONDS = parseInt(process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS || `${60 * 60 * 24 * 30}`, 10); // 30d
const SESSION_KEY_PREFIX = 'auth:session:';
const OAUTH_STATE_KEY_PREFIX = 'auth:oauth:state:';
const REVOKED_JTI_KEY_PREFIX = 'auth:revoked:jti:';

function requireJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || !String(secret).trim()) {
    const err = new Error('JWT_SECRET is required for auth operations');
    err.code = 'AUTH_JWT_SECRET_MISSING';
    throw err;
  }
  return secret;
}

function makeId(prefix) {
  return `${prefix}_${crypto.randomBytes(12).toString('hex')}`;
}

function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function getProviderConfig(provider) {
  const p = String(provider || '').toLowerCase();
  const cfg = {
    google: {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      scope: 'openid email profile',
      clientId: process.env.OAUTH_GOOGLE_CLIENT_ID,
      redirectUri: process.env.OAUTH_GOOGLE_REDIRECT_URI
    },
    discord: {
      authUrl: 'https://discord.com/oauth2/authorize',
      scope: 'identify email',
      clientId: process.env.OAUTH_DISCORD_CLIENT_ID,
      redirectUri: process.env.OAUTH_DISCORD_REDIRECT_URI
    },
    steam: {
      authUrl: 'https://steamcommunity.com/openid/login',
      scope: 'openid',
      clientId: process.env.OAUTH_STEAM_CLIENT_ID || 'steam-openid',
      redirectUri: process.env.OAUTH_STEAM_REDIRECT_URI
    }
  };

  return cfg[p] || null;
}

async function persistSession({ sessionId, userId, refreshTokenHash, jti, expiresAt, ipAddress = null, userAgent = null }) {
  const payload = {
    sessionId,
    userId,
    refreshTokenHash,
    jti,
    expiresAt,
    ipAddress,
    userAgent,
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    revoked: false
  };

  await cacheService.setJson(`${SESSION_KEY_PREFIX}${sessionId}`, payload, REFRESH_TOKEN_TTL_SECONDS);

  if (!postgres.isEnabled()) return payload;

  try {
    await postgres.query(
      `
      INSERT INTO user_sessions (id, user_id, refresh_token_hash, jti, ip_address, user_agent, expires_at, created_at, last_seen_at, is_revoked)
      VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, NOW(), NOW(), FALSE)
      ON CONFLICT (id)
      DO UPDATE SET
        refresh_token_hash = EXCLUDED.refresh_token_hash,
        jti = EXCLUDED.jti,
        ip_address = EXCLUDED.ip_address,
        user_agent = EXCLUDED.user_agent,
        expires_at = EXCLUDED.expires_at,
        last_seen_at = NOW(),
        is_revoked = FALSE
      `,
      [sessionId, userId, refreshTokenHash, jti, ipAddress, userAgent, expiresAt]
    );
  } catch (error) {
    // Keep cache as source-of-truth fallback.
  }

  return payload;
}

async function loadSession(sessionId) {
  const cached = await cacheService.getJson(`${SESSION_KEY_PREFIX}${sessionId}`);
  if (cached) return cached;

  if (!postgres.isEnabled()) return null;

  try {
    const result = await postgres.query(
      `SELECT id, user_id, refresh_token_hash, jti, ip_address, user_agent, expires_at, is_revoked, revoked_reason, last_seen_at
       FROM user_sessions WHERE id = $1 LIMIT 1`,
      [sessionId]
    );
    const row = result.rows[0];
    if (!row) return null;

    const mapped = {
      sessionId: row.id,
      userId: row.user_id,
      refreshTokenHash: row.refresh_token_hash,
      jti: row.jti,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      expiresAt: new Date(row.expires_at).toISOString(),
      revoked: !!row.is_revoked,
      revokedReason: row.revoked_reason || null,
      lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at).toISOString() : null
    };

    const ttl = Math.max(1, Math.floor((new Date(mapped.expiresAt).getTime() - Date.now()) / 1000));
    await cacheService.setJson(`${SESSION_KEY_PREFIX}${sessionId}`, mapped, ttl);
    return mapped;
  } catch (error) {
    return null;
  }
}

async function revokeSession(sessionId, reason = 'manual_logout') {
  const session = await loadSession(sessionId);
  if (!session) return false;

  session.revoked = true;
  session.revokedReason = reason;
  session.revokedAt = new Date().toISOString();

  const ttl = Math.max(1, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000));
  await cacheService.setJson(`${SESSION_KEY_PREFIX}${sessionId}`, session, ttl);
  await cacheService.set(`${REVOKED_JTI_KEY_PREFIX}${session.jti}`, '1', ttl);

  if (postgres.isEnabled()) {
    try {
      await postgres.query(
        `UPDATE user_sessions
         SET is_revoked = TRUE, revoked_reason = $2, revoked_at = NOW(), last_seen_at = NOW()
         WHERE id = $1`,
        [sessionId, reason]
      );
    } catch (error) {
      // Keep cache state even if DB write fails.
    }
  }

  return true;
}

async function isJtiRevoked(jti) {
  if (!jti) return true;
  const revoked = await cacheService.get(`${REVOKED_JTI_KEY_PREFIX}${jti}`);
  return revoked === '1';
}

function buildAccessTokenPayload({ user, sessionId, jti, amr = ['pwd'] }) {
  return {
    sub: user.id,
    username: user.username,
    email: user.email || null,
    sid: sessionId,
    jti,
    amr,
    typ: 'access'
  };
}

function buildRefreshTokenPayload({ user, sessionId, jti }) {
  return {
    sub: user.id,
    sid: sessionId,
    jti,
    typ: 'refresh'
  };
}

function buildAmrList(context = {}) {
  const amr = ['pwd'];
  if (context.mfaVerified || context.stepUpVerified) amr.push('mfa');
  return amr;
}

function issueAccessTokenForSession(user, sessionId, context = {}) {
  const secret = requireJwtSecret();
  const accessJti = makeId('jti');
  const amr = buildAmrList(context);
  const accessToken = jwt.sign(buildAccessTokenPayload({ user, sessionId, jti: accessJti, amr }), secret, {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    issuer: 'scarygamesai',
    audience: 'sgai-api'
  });

  return {
    accessToken,
    accessJti,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    amr
  };
}

async function issueTokenPair(user, context = {}) {
  const sessionId = makeId('sid');
  const refreshJti = makeId('rjti');

  const { accessToken, expiresIn, amr } = issueAccessTokenForSession(user, sessionId, context);

  const refreshToken = jwt.sign(
    {
      ...buildRefreshTokenPayload({ user, sessionId, jti: refreshJti }),
      username: user.username,
      email: user.email || null,
      amr
    },
    requireJwtSecret(),
    {
      expiresIn: REFRESH_TOKEN_TTL_SECONDS,
      issuer: 'scarygamesai',
      audience: 'sgai-api'
    }
  );

  const refreshTokenHash = sha256(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString();

  await persistSession({
    sessionId,
    userId: user.id,
    refreshTokenHash,
    jti: refreshJti,
    expiresAt,
    ipAddress: context.ipAddress || null,
    userAgent: context.userAgent || null
  });

  return {
    accessToken,
    refreshToken,
    sessionId,
    expiresIn,
    refreshExpiresIn: REFRESH_TOKEN_TTL_SECONDS,
    amr
  };
}

async function rotateRefreshToken(refreshToken, context = {}) {
  const secret = requireJwtSecret();
  const decoded = jwt.verify(refreshToken, secret, { issuer: 'scarygamesai', audience: 'sgai-api' });

  if (decoded.typ !== 'refresh') {
    const err = new Error('Invalid refresh token type');
    err.code = 'AUTH_REFRESH_INVALID_TYPE';
    throw err;
  }

  const session = await loadSession(decoded.sid);
  if (!session) {
    const err = new Error('Session not found');
    err.code = 'AUTH_SESSION_NOT_FOUND';
    throw err;
  }

  if (session.revoked) {
    const err = new Error('Session revoked');
    err.code = 'AUTH_SESSION_REVOKED';
    throw err;
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    const err = new Error('Session expired');
    err.code = 'AUTH_SESSION_EXPIRED';
    throw err;
  }

  const incomingHash = sha256(refreshToken);
  if (incomingHash !== session.refreshTokenHash) {
    await revokeSession(session.sessionId, 'refresh_token_replay_detected');
    const err = new Error('Refresh token replay detected');
    err.code = 'AUTH_REFRESH_REPLAY_DETECTED';
    throw err;
  }

  const nextRefreshJti = makeId('rjti');

  const user = {
    id: decoded.sub,
    username: decoded.username || 'Player',
    email: decoded.email || null
  };

  const amr = Array.isArray(decoded.amr) && decoded.amr.length ? decoded.amr : ['pwd'];
  const nextAccess = issueAccessTokenForSession(user, session.sessionId, { mfaVerified: amr.includes('mfa') });

  const nextRefreshToken = jwt.sign(
    {
      ...buildRefreshTokenPayload({ user, sessionId: session.sessionId, jti: nextRefreshJti }),
      username: user.username,
      email: user.email,
      amr
    },
    secret,
    {
      expiresIn: REFRESH_TOKEN_TTL_SECONDS,
      issuer: 'scarygamesai',
      audience: 'sgai-api'
    }
  );

  const nextRefreshHash = sha256(nextRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString();

  await persistSession({
    sessionId: session.sessionId,
    userId: session.userId,
    refreshTokenHash: nextRefreshHash,
    jti: nextRefreshJti,
    expiresAt,
    ipAddress: context.ipAddress || session.ipAddress || null,
    userAgent: context.userAgent || session.userAgent || null
  });

  return {
    accessToken: nextAccess.accessToken,
    refreshToken: nextRefreshToken,
    sessionId: session.sessionId,
    expiresIn: nextAccess.expiresIn,
    refreshExpiresIn: REFRESH_TOKEN_TTL_SECONDS,
    amr
  };
}

function verifyAccessToken(accessToken) {
  const secret = requireJwtSecret();
  const decoded = jwt.verify(accessToken, secret, { issuer: 'scarygamesai', audience: 'sgai-api' });
  if (decoded.typ !== 'access') {
    const err = new Error('Invalid access token type');
    err.code = 'AUTH_ACCESS_INVALID_TYPE';
    throw err;
  }
  return decoded;
}

async function revokeJti(jti, ttlSeconds = ACCESS_TOKEN_TTL_SECONDS) {
  if (!jti) return;
  const ttl = Math.max(1, parseInt(ttlSeconds, 10) || ACCESS_TOKEN_TTL_SECONDS);
  await cacheService.set(`${REVOKED_JTI_KEY_PREFIX}${jti}`, '1', ttl);
}

async function isSessionRevoked(sessionId) {
  const session = await loadSession(sessionId);
  if (!session) return true;
  if (session.revoked) return true;
  if (new Date(session.expiresAt).getTime() <= Date.now()) return true;
  return false;
}

async function listUserSessions(userId, options = {}) {
  const includeRevoked = !!options.includeRevoked;
  const limit = Math.min(100, Math.max(1, parseInt(options.limit || 20, 10)));

  if (!postgres.isEnabled()) return [];

  try {
    const result = await postgres.query(
      `SELECT id, user_id, jti, ip_address, user_agent, device_name, is_revoked, revoked_reason, created_at, expires_at, last_seen_at
       FROM user_sessions
       WHERE user_id = $1
         AND ($2::boolean = TRUE OR is_revoked = FALSE)
       ORDER BY created_at DESC
       LIMIT $3`,
      [userId, includeRevoked, limit]
    );

    return result.rows.map((row) => ({
      sessionId: row.id,
      userId: row.user_id,
      jti: row.jti,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      deviceName: row.device_name || null,
      revoked: !!row.is_revoked,
      revokedReason: row.revoked_reason || null,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
      lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at).toISOString() : null
    }));
  } catch (error) {
    return [];
  }
}

async function revokeAllUserSessions(userId, options = {}) {
  const reason = options.reason || 'manual_logout_all';
  const exceptSessionId = options.exceptSessionId || null;
  let revokedCount = 0;

  if (postgres.isEnabled()) {
    try {
      const result = await postgres.query(
        `UPDATE user_sessions
         SET is_revoked = TRUE,
             revoked_reason = $3,
             revoked_at = NOW(),
             last_seen_at = NOW()
         WHERE user_id = $1
           AND ($2::text IS NULL OR id <> $2)
           AND is_revoked = FALSE
         RETURNING id, jti, expires_at`,
        [userId, exceptSessionId, reason]
      );

      revokedCount = result.rowCount || 0;
      for (const row of result.rows) {
        const ttl = Math.max(1, Math.floor((new Date(row.expires_at).getTime() - Date.now()) / 1000));
        await revokeJti(row.jti, ttl);
        const key = `${SESSION_KEY_PREFIX}${row.id}`;
        const cached = await cacheService.getJson(key);
        if (cached) {
          cached.revoked = true;
          cached.revokedReason = reason;
          cached.revokedAt = new Date().toISOString();
          await cacheService.setJson(key, cached, ttl);
        }
      }

      return { revokedCount };
    } catch (error) {
      return { revokedCount: 0 };
    }
  }

  return { revokedCount };
}

async function touchSession(sessionId, context = {}) {
  if (!sessionId) return;

  const existing = await loadSession(sessionId);
  if (!existing) return;

  const nowMs = Date.now();
  const lastSeenMs = existing.lastSeenAt ? new Date(existing.lastSeenAt).getTime() : 0;
  const changedNetworkContext = (context.ipAddress && context.ipAddress !== existing.ipAddress)
    || (context.userAgent && context.userAgent !== existing.userAgent)
    || (context.deviceName && context.deviceName !== existing.deviceName);

  if (!changedNetworkContext && lastSeenMs > 0 && nowMs - lastSeenMs < SESSION_TOUCH_MIN_INTERVAL_SECONDS * 1000) {
    return;
  }

  const ttl = Math.max(1, Math.floor((new Date(existing.expiresAt).getTime() - nowMs) / 1000));
  existing.lastSeenAt = new Date(nowMs).toISOString();
  existing.ipAddress = context.ipAddress || existing.ipAddress || null;
  existing.userAgent = context.userAgent || existing.userAgent || null;
  if (context.deviceName) existing.deviceName = context.deviceName;
  await cacheService.setJson(`${SESSION_KEY_PREFIX}${sessionId}`, existing, ttl);

  if (postgres.isEnabled()) {
    try {
      await postgres.query(
        `UPDATE user_sessions
         SET last_seen_at = NOW(),
             ip_address = COALESCE($2, ip_address),
             user_agent = COALESCE($3, user_agent),
             device_name = COALESCE($4, device_name)
         WHERE id = $1`,
        [sessionId, context.ipAddress || null, context.userAgent || null, context.deviceName || null]
      );
    } catch (error) {
      // Non-fatal.
    }
  }
}

async function parseJsonResponse(response) {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function normalizeScope(scope) {
  if (!scope) return null;
  if (Array.isArray(scope)) return scope.join(' ');
  return String(scope);
}

function parseJwtPayload(token) {
  const parts = String(token || '').split('.');
  if (parts.length < 2) return {};
  try {
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payload);
  } catch {
    return {};
  }
}

async function exchangeOAuthCode(provider, { code, redirectUri = null, codeVerifier = null } = {}) {
  const p = String(provider || '').toLowerCase();
  if (!code || !String(code).trim()) {
    const err = new Error('OAuth authorization code is required');
    err.code = 'AUTH_OAUTH_CODE_REQUIRED';
    throw err;
  }

  if (p === 'steam') {
    const err = new Error('Steam uses OpenID and does not support OAuth code exchange in this service');
    err.code = 'AUTH_OAUTH_STEAM_OPENID_REQUIRED';
    throw err;
  }

  let tokenUrl = null;
  let body = null;

  if (p === 'google') {
    tokenUrl = process.env.OAUTH_GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token';
    body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(code),
      client_id: process.env.OAUTH_GOOGLE_CLIENT_ID || '',
      client_secret: process.env.OAUTH_GOOGLE_CLIENT_SECRET || '',
      redirect_uri: redirectUri || process.env.OAUTH_GOOGLE_REDIRECT_URI || ''
    });
    if (codeVerifier) body.set('code_verifier', String(codeVerifier));
  } else if (p === 'discord') {
    tokenUrl = process.env.OAUTH_DISCORD_TOKEN_URL || 'https://discord.com/api/oauth2/token';
    body = new URLSearchParams({
      grant_type: 'authorization_code',
      code: String(code),
      client_id: process.env.OAUTH_DISCORD_CLIENT_ID || '',
      client_secret: process.env.OAUTH_DISCORD_CLIENT_SECRET || '',
      redirect_uri: redirectUri || process.env.OAUTH_DISCORD_REDIRECT_URI || ''
    });
    if (codeVerifier) body.set('code_verifier', String(codeVerifier));
  } else {
    const err = new Error('Unsupported OAuth provider');
    err.code = 'AUTH_OAUTH_PROVIDER_UNSUPPORTED';
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OAUTH_HTTP_TIMEOUT_MS);

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json'
      },
      body,
      signal: controller.signal
    });
    const payload = await parseJsonResponse(response);

    if (!response.ok) {
      const err = new Error(payload.error_description || payload.error || `Token exchange failed (${response.status})`);
      err.code = 'AUTH_OAUTH_PROVIDER_EXCHANGE_FAILED';
      err.status = response.status;
      throw err;
    }

    return {
      accessToken: payload.access_token || null,
      refreshToken: payload.refresh_token || null,
      tokenType: payload.token_type || 'Bearer',
      scope: normalizeScope(payload.scope),
      idToken: payload.id_token || null,
      raw: payload
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      const err = new Error('OAuth provider token exchange timed out');
      err.code = 'AUTH_OAUTH_PROVIDER_TIMEOUT';
      throw err;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOAuthProfile(provider, tokens = {}) {
  const p = String(provider || '').toLowerCase();
  const accessToken = tokens.accessToken;

  if (p === 'google') {
    let profile = {};
    if (accessToken) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), OAUTH_HTTP_TIMEOUT_MS);
      try {
        const response = await fetch(process.env.OAUTH_GOOGLE_USERINFO_URL || 'https://openidconnect.googleapis.com/v1/userinfo', {
          headers: {
            authorization: `Bearer ${accessToken}`,
            accept: 'application/json'
          },
          signal: controller.signal
        });

        if (response.ok) {
          profile = await parseJsonResponse(response);
        }
      } catch {
        // Fallback below.
      } finally {
        clearTimeout(timeout);
      }
    }

    if ((!profile || !profile.sub) && tokens.idToken) {
      const idPayload = parseJwtPayload(tokens.idToken);
      profile = {
        ...profile,
        sub: profile.sub || idPayload.sub,
        email: profile.email || idPayload.email,
        email_verified: profile.email_verified ?? idPayload.email_verified,
        name: profile.name || idPayload.name,
        picture: profile.picture || idPayload.picture
      };
    }

    if (!profile || !profile.sub) {
      const err = new Error('Google profile does not include subject identifier');
      err.code = 'AUTH_OAUTH_PROVIDER_PROFILE_INVALID';
      throw err;
    }

    return {
      providerUserId: String(profile.sub),
      providerEmail: profile.email ? String(profile.email).toLowerCase() : null,
      profile
    };
  }

  if (p === 'discord') {
    if (!accessToken) {
      const err = new Error('Discord profile fetch requires access token');
      err.code = 'AUTH_OAUTH_PROVIDER_PROFILE_INVALID';
      throw err;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OAUTH_HTTP_TIMEOUT_MS);

    try {
      const response = await fetch(process.env.OAUTH_DISCORD_USERINFO_URL || 'https://discord.com/api/users/@me', {
        headers: {
          authorization: `Bearer ${accessToken}`,
          accept: 'application/json'
        },
        signal: controller.signal
      });
      const profile = await parseJsonResponse(response);

      if (!response.ok) {
        const err = new Error(profile.message || `Discord profile fetch failed (${response.status})`);
        err.code = 'AUTH_OAUTH_PROVIDER_PROFILE_FETCH_FAILED';
        err.status = response.status;
        throw err;
      }

      if (!profile.id) {
        const err = new Error('Discord profile does not include id');
        err.code = 'AUTH_OAUTH_PROVIDER_PROFILE_INVALID';
        throw err;
      }

      return {
        providerUserId: String(profile.id),
        providerEmail: profile.email ? String(profile.email).toLowerCase() : null,
        profile
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        const err = new Error('OAuth provider profile fetch timed out');
        err.code = 'AUTH_OAUTH_PROVIDER_TIMEOUT';
        throw err;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  if (p === 'steam') {
    return null;
  }

  const err = new Error('Unsupported OAuth provider');
  err.code = 'AUTH_OAUTH_PROVIDER_UNSUPPORTED';
  throw err;
}

async function createOAuthState(provider, returnTo = '/') {
  const state = makeId('oauth_state');
  const verifier = makeId('pkce_verifier');
  const providerConfig = getProviderConfig(provider);

  if (!providerConfig) {
    const err = new Error('Unsupported OAuth provider');
    err.code = 'AUTH_OAUTH_PROVIDER_UNSUPPORTED';
    throw err;
  }

  const payload = {
    provider: String(provider).toLowerCase(),
    returnTo,
    verifier,
    createdAt: new Date().toISOString()
  };

  await cacheService.setJson(`${OAUTH_STATE_KEY_PREFIX}${state}`, payload, 600);

  return { state, verifier, providerConfig };
}

async function consumeOAuthState(state) {
  const key = `${OAUTH_STATE_KEY_PREFIX}${state}`;
  const payload = await cacheService.getJson(key);
  if (!payload) return null;
  await cacheService.del(key);
  return payload;
}

function base32Encode(buffer) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const byte of buffer) {
    bits += byte.toString(2).padStart(8, '0');
  }

  let output = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    output += alphabet[parseInt(chunk, 2)];
  }

  return output;
}

function generateTotpSecret() {
  const secretBytes = crypto.randomBytes(20);
  return base32Encode(secretBytes);
}

function decodeBase32(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const sanitized = String(base32 || '').replace(/=+$/g, '').toUpperCase();
  let bits = '';

  for (const c of sanitized) {
    const idx = alphabet.indexOf(c);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, '0');
  }

  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function generateTotpCode(secret, timestamp = Date.now(), stepSeconds = 30, digits = 6) {
  const key = decodeBase32(secret);
  const counter = Math.floor(timestamp / 1000 / stepSeconds);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % (10 ** digits);

  return String(code).padStart(digits, '0');
}

function verifyTotpCode(secret, code, skew = 1) {
  const now = Date.now();
  for (let i = -skew; i <= skew; i += 1) {
    const sample = now + i * 30000;
    if (generateTotpCode(secret, sample) === String(code || '').trim()) {
      return true;
    }
  }
  return false;
}

function getTotpEncryptionKey() {
  const direct = String(process.env.AUTH_TOTP_ENCRYPTION_KEY || '').trim();
  if (direct) {
    try {
      const decoded = Buffer.from(direct, 'base64');
      if (decoded.length === 32) return decoded;
    } catch {
      // Fall through to validation error below.
    }

    const err = new Error('AUTH_TOTP_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
    err.code = 'AUTH_TOTP_KEY_INVALID';
    throw err;
  }

  if (process.env.NODE_ENV === 'production') {
    const err = new Error('AUTH_TOTP_ENCRYPTION_KEY is required in production');
    err.code = 'AUTH_TOTP_KEY_REQUIRED';
    throw err;
  }

  const fallbackSecret = process.env.JWT_SECRET || 'dev-totp-fallback-secret';
  return crypto.createHash('sha256').update(`${TOTP_ENCRYPTION_CONTEXT}:${fallbackSecret}`).digest();
}

function encryptTotpSecret(secret) {
  const plaintext = String(secret || '').trim();
  if (!plaintext) return null;

  const key = getTotpEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${ciphertext.toString('base64url')}`;
}

function decryptTotpSecret(encryptedValue) {
  const input = String(encryptedValue || '').trim();
  if (!input) return null;

  if (!input.startsWith('v1:')) {
    return input;
  }

  const parts = input.split(':');
  if (parts.length !== 4) {
    const err = new Error('Malformed encrypted TOTP secret');
    err.code = 'AUTH_TOTP_DECRYPT_FAILED';
    throw err;
  }

  const [, ivB64, tagB64, cipherB64] = parts;
  try {
    const key = getTotpEncryptionKey();
    const iv = Buffer.from(ivB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');
    const ciphertext = Buffer.from(cipherB64, 'base64url');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    const err = new Error('Unable to decrypt TOTP secret');
    err.code = 'AUTH_TOTP_DECRYPT_FAILED';
    throw err;
  }
}

function generateBackupCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i += 1) {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase();
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5, 10)}`);
  }
  return codes;
}

function hashBackupCode(code) {
  return sha256(String(code || '').replace(/\s+/g, '').toUpperCase());
}

module.exports = {
  issueTokenPair,
  issueAccessTokenForSession,
  rotateRefreshToken,
  verifyAccessToken,
  isJtiRevoked,
  revokeJti,
  isSessionRevoked,
  listUserSessions,
  revokeAllUserSessions,
  touchSession,
  revokeSession,
  createOAuthState,
  consumeOAuthState,
  getProviderConfig,
  exchangeOAuthCode,
  fetchOAuthProfile,
  generateTotpSecret,
  generateTotpCode,
  verifyTotpCode,
  encryptTotpSecret,
  decryptTotpSecret,
  generateBackupCodes,
  hashBackupCode
};
