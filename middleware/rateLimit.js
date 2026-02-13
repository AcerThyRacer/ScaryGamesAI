/**
 * Distributed rate limiting middleware.
 * Uses Redis via cacheService when available, in-memory fallback otherwise.
 */

const cacheService = require('../services/cacheService');
const observability = require('../services/observability');

function parsePositiveInt(value, fallback) {
  const parsed = parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getIp(req) {
  return (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || 'unknown')
    .toString()
    .split(',')[0]
    .trim();
}

function buildRateLimitKey({ scope, req, includeUser = true }) {
  const ip = getIp(req);
  const userId = includeUser && req.user?.id ? String(req.user.id) : 'anon';
  const route = req.baseUrl || req.path || 'route';
  return `rl:${scope}:${route}:${ip}:${userId}`;
}

function createRateLimiter({
  scope = 'api',
  limit = 120,
  windowSeconds = 60,
  includeUser = true,
  skip = null
} = {}) {
  const max = parsePositiveInt(limit, 120);
  const windowTtl = parsePositiveInt(windowSeconds, 60);

  return async function rateLimitMiddleware(req, res, next) {
    const startedAt = Date.now();
    try {
      if (typeof skip === 'function' && skip(req)) {
        observability.recordPerfEvent('rate_limit.middleware', {
          scope,
          skipped: true,
          durationMs: Date.now() - startedAt,
          method: req?.method || null,
          path: req?.path || null
        });
        return next();
      }

      const key = buildRateLimitKey({ scope, req, includeUser });
      const currentCount = await cacheService.increment(key, windowTtl);
      const remaining = Math.max(0, max - currentCount);

      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(remaining));
      res.setHeader('X-RateLimit-Reset', String(windowTtl));

      if (currentCount > max) {
        observability.recordSecurityEvent('rate_limit.exceeded', {
          scope,
          limit: max,
          currentCount,
          method: req?.method || null,
          path: req?.path || null,
          userId: req?.user?.id || null,
          ipAddress: getIp(req)
        }, {
          force: true
        });

        observability.recordPerfEvent('rate_limit.middleware', {
          scope,
          exceeded: true,
          durationMs: Date.now() - startedAt,
          method: req?.method || null,
          path: req?.path || null
        });

        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please retry later.'
          },
          meta: {
            scope,
            limit: max,
            windowSeconds: windowTtl
          }
        });
      }

      observability.recordPerfEvent('rate_limit.middleware', {
        scope,
        exceeded: false,
        durationMs: Date.now() - startedAt,
        method: req?.method || null,
        path: req?.path || null
      });

      return next();
    } catch (error) {
      observability.recordSecurityEvent('rate_limit.error', {
        scope,
        method: req?.method || null,
        path: req?.path || null,
        message: error?.message || 'unknown'
      }, {
        force: true
      });
      return next();
    }
  };
}

module.exports = {
  createRateLimiter
};
