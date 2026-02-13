/**
 * Authentication middleware (Phase 6)
 * - Verifies JWT access tokens
 * - Checks session revocation/JTI revocation
 * - Falls back to dev bypass only in development
 */

const db = require('../models/database');
const authService = require('../services/authService');
const observability = require('../services/observability');

function boolFromEnv(key, fallback = false) {
  const value = process.env[key];
  if (value == null) return fallback;
  return String(value).toLowerCase() === 'true';
}

function demoUser() {
  return { id: 'demo-user', username: 'DemoUser', email: 'demo@scarygames.ai' };
}

function isDevBypassEnabled() {
  const isDev = process.env.NODE_ENV === 'development';
  const enabled = boolFromEnv('AUTH_ALLOW_DEV_BYPASS', true);
  return isDev && enabled;
}

function rejectAuth(res, code, message, status = 401) {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message
    }
  });
}

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || 'unknown')
    .toString()
    .split(',')[0]
    .trim();
}

function emitAuthDenied(req, code, status) {
  observability.recordSecurityEvent('auth.middleware.denied', {
    code,
    status,
    method: req?.method || null,
    path: req?.path || null,
    apiVersion: req?.apiVersion || null,
    ipAddress: clientIp(req)
  });
}

function emitAuthPerf(req, startMs, fields = {}) {
  observability.recordPerfEvent('auth.middleware.latency', {
    durationMs: Date.now() - startMs,
    method: req?.method || null,
    path: req?.path || null,
    apiVersion: req?.apiVersion || null,
    ...fields
  });
}

async function authMiddleware(req, res, next) {
  const startMs = Date.now();
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      if (isDevBypassEnabled()) {
        req.user = demoUser();
        req.auth = {
          method: 'dev-bypass',
          isDemo: true,
          isDevelopmentBypass: true,
          tokenPresent: false,
          mfaVerified: false
        };
        emitAuthPerf(req, startMs, { authMethod: 'dev-bypass' });
        return next();
      }

      emitAuthDenied(req, 'AUTH_TOKEN_MISSING', 401);
      emitAuthPerf(req, startMs, { denied: true, code: 'AUTH_TOKEN_MISSING' });
      return rejectAuth(res, 'AUTH_TOKEN_MISSING', 'No token provided', 401);
    }

    const parts = authHeader.split(' ');
    const token = parts.length >= 2 ? parts[1] : null;
    if (!token) {
      emitAuthDenied(req, 'AUTH_TOKEN_INVALID_FORMAT', 401);
      emitAuthPerf(req, startMs, { denied: true, code: 'AUTH_TOKEN_INVALID_FORMAT' });
      return rejectAuth(res, 'AUTH_TOKEN_INVALID_FORMAT', 'Invalid authorization header', 401);
    }

    // Legacy fallback for non-production migration window.
    if (token === 'demo-token' && process.env.NODE_ENV !== 'production' && !boolFromEnv('AUTH_DISABLE_DEMO_TOKEN', false)) {
      req.user = demoUser();
      req.auth = {
        method: 'demo-token',
        isDemo: true,
        isDevelopmentBypass: false,
        tokenPresent: true,
        mfaVerified: false
      };
      emitAuthPerf(req, startMs, { authMethod: 'demo-token' });
      return next();
    }

    let decoded;
    try {
      decoded = authService.verifyAccessToken(token);
    } catch (error) {
      const code = error.code || 'AUTH_TOKEN_INVALID';
      emitAuthDenied(req, code, 401);
      emitAuthPerf(req, startMs, { denied: true, code });
      return rejectAuth(res, code, 'Invalid or expired access token', 401);
    }

    if (await authService.isJtiRevoked(decoded.jti)) {
      emitAuthDenied(req, 'AUTH_TOKEN_REVOKED', 401);
      emitAuthPerf(req, startMs, { denied: true, code: 'AUTH_TOKEN_REVOKED' });
      return rejectAuth(res, 'AUTH_TOKEN_REVOKED', 'Token has been revoked', 401);
    }

    if (await authService.isSessionRevoked(decoded.sid)) {
      emitAuthDenied(req, 'AUTH_SESSION_REVOKED', 401);
      emitAuthPerf(req, startMs, { denied: true, code: 'AUTH_SESSION_REVOKED' });
      return rejectAuth(res, 'AUTH_SESSION_REVOKED', 'Session has been revoked or expired', 401);
    }

    await authService.touchSession(decoded.sid, {
      ipAddress: clientIp(req),
      userAgent: req.headers['user-agent'] || null
    });

    const user = db.findOne('users', { id: decoded.sub }) || {
      id: decoded.sub,
      username: decoded.username || 'Player',
      email: decoded.email || null
    };

    req.user = user;
    req.auth = {
      method: 'jwt',
      isDemo: user.id === 'demo-user',
      isDevelopmentBypass: false,
      tokenPresent: true,
      sessionId: decoded.sid,
      jti: decoded.jti,
      mfaVerified: Array.isArray(decoded.amr) && decoded.amr.includes('mfa')
    };

    emitAuthPerf(req, startMs, { authMethod: 'jwt', mfaVerified: req.auth.mfaVerified === true });
    return next();
  } catch (error) {
    emitAuthDenied(req, 'AUTH_FAILED', 401);
    emitAuthPerf(req, startMs, { denied: true, code: 'AUTH_FAILED' });
    return rejectAuth(res, 'AUTH_FAILED', 'Authentication failed', 401);
  }
}

function requireMonetizationAuth(req, res, next) {
  return authMiddleware(req, res, () => {
    if (req.auth?.isDemo || req.auth?.isDevelopmentBypass || req.user?.id === 'demo-user') {
      return rejectAuth(
        res,
        'DEMO_AUTH_FORBIDDEN',
        'Demo/development authentication is not allowed for monetization mutations',
        403
      );
    }

    if (String(process.env.REQUIRE_2FA_FOR_MONETIZATION || 'false') === 'true' && !req.auth?.mfaVerified) {
      return rejectAuth(
        res,
        'MFA_REQUIRED',
        'Multi-factor authentication is required for monetization actions',
        403
      );
    }

    return next();
  });
}

module.exports = authMiddleware;
module.exports.requireMonetizationAuth = requireMonetizationAuth;
