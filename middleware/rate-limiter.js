/**
 * Rate Limiting Middleware
 * Uniform rate limiting across all API endpoints
 * Prevents abuse and ensures fair usage
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');

// Redis connection for distributed rate limiting (optional)
let redisClient = null;

try {
	if (process.env.REDIS_URL) {
		redisClient = new Redis(process.env.REDIS_URL);
		console.log('[RateLimiter] Redis connected for distributed rate limiting');
	}
} catch (error) {
	console.warn('[RateLimiter] Redis not available, using memory store');
}

/**
 * Create rate limiter with configurable options
 */
function createRateLimiter(options = {}) {
	const {
		windowMs = 15 * 60 * 1000, // 15 minutes
		max = 100, // limit each IP to 100 requests per windowMs
		message = 'Too many requests, please try again later.',
		standardHeaders = true, // Return rate limit info in the `RateLimit-*` headers
		legacyHeaders = false, // Disable the `X-RateLimit-*` headers
		skipSuccessfulRequests = false,
		skipFailedRequests = false,
		keyGenerator = (req) => req.ip
	} = options;

	// Use Redis store if available, otherwise use memory store
	const store = redisClient
		? new RedisStore({
				sendCommand: (...args) => redisClient.call(...args),
				windowMs
			})
		: undefined;

	return rateLimit({
		windowMs,
		max,
		message: {
			success: false,
			error: {
				code: 'RATE_LIMIT_EXCEEDED',
				message
			}
		},
		standardHeaders,
		legacyHeaders,
		skipSuccessfulRequests,
		skipFailedRequests,
		keyGenerator,
		store,
		handler: (req, res) => {
			res.status(429).json({
				success: false,
				error: {
					code: 'RATE_LIMIT_EXCEEDED',
					message,
					retryAfter: Math.ceil(windowMs / 1000)
				}
			});
		}
	});
}

/**
 * Get user tier for rate limiting
 */
function getUserTier(req) {
	// Check if user is authenticated
	if (!req.user) {
		return 'anonymous';
	}

	// Check for premium subscription
	if (req.user.tier === 'elder' || req.user.isPremium) {
		return 'premium';
	}

	if (req.user.tier === 'hunter') {
		return 'authenticated';
	}

	return 'authenticated';
}

/**
 * Dynamic rate limiter based on user tier
 */
function createTieredRateLimiter() {
	const limits = {
		anonymous: {
			windowMs: 15 * 60 * 1000, // 15 minutes
			max: 50 // 50 requests per 15 minutes
		},
		authenticated: {
			windowMs: 15 * 60 * 1000,
			max: 200 // 200 requests per 15 minutes
		},
		premium: {
			windowMs: 15 * 60 * 1000,
			max: 1000 // 1000 requests per 15 minutes
		}
	};

	return rateLimit({
		windowMs: 15 * 60 * 1000,
		max: (req, res) => {
			const tier = getUserTier(req);
			return limits[tier]?.max || limits.anonymous.max;
		},
		message: {
			success: false,
			error: {
				code: 'RATE_LIMIT_EXCEEDED',
				message: 'Too many requests, please upgrade your plan for higher limits.'
			}
		},
		standardHeaders: true,
		legacyHeaders: false,
		keyGenerator: (req) => {
			// Use user ID if authenticated, otherwise IP
			return req.user?.id || `ip:${req.ip}`;
		},
		store: redisClient
			? new RedisStore({
					sendCommand: (...args) => redisClient.call(...args),
					windowMs: 15 * 60 * 1000
				})
			: undefined,
		handler: (req, res) => {
			const tier = getUserTier(req);
			res.status(429).json({
				success: false,
				error: {
					code: 'RATE_LIMIT_EXCEEDED',
					message: `Rate limit exceeded for ${tier} tier`,
					retryAfter: Math.ceil(15 * 60), // 15 minutes in seconds
					tier,
					upgradeUrl: '/subscription'
				}
			});
		}
	});
}

/**
 * Strict rate limiter for sensitive endpoints (auth, payments)
 */
function createStrictRateLimiter() {
	return createRateLimiter({
		windowMs: 15 * 60 * 1000, // 15 minutes
		max: 10, // 10 requests per 15 minutes
		message: 'Too many attempts, please try again after 15 minutes.',
		skipSuccessfulRequests: true // Only count failed requests
	});
}

/**
 * API rate limiter for general endpoints
 */
function createAPILimiter() {
	return createRateLimiter({
		windowMs: 15 * 60 * 1000,
		max: 100,
		message: 'Too many API requests, please slow down.'
	});
}

/**
 * Search rate limiter (expensive operations)
 */
function createSearchLimiter() {
	return createRateLimiter({
		windowMs: 60 * 1000, // 1 minute
		max: 10, // 10 searches per minute
		message: 'Too many searches, please wait a moment.'
	});
}

/**
 * Upload rate limiter (file uploads)
 */
function createUploadLimiter() {
	return createRateLimiter({
		windowMs: 60 * 60 * 1000, // 1 hour
		max: 20, // 20 uploads per hour
		message: 'Upload limit reached, please try again later.'
	});
}

/**
 * Create rate limiter for specific route
 */
function forRoute(options) {
	return createRateLimiter(options);
}

// Export middleware
module.exports = {
	createRateLimiter,
	createTieredRateLimiter,
	createStrictRateLimiter,
	createAPILimiter,
	createSearchLimiter,
	createUploadLimiter,
	forRoute,

	// Pre-configured limiters
	strict: createStrictRateLimiter(),
	api: createAPILimiter(),
	search: createSearchLimiter(),
	upload: createUploadLimiter(),
	tiered: createTieredRateLimiter()
};
