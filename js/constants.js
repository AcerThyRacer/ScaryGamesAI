/**
 * ScaryGamesAI Centralized Constants
 * Replaces magic numbers throughout the codebase
 * Organized by domain/feature
 */

const SGAIConstants = (function() {
	'use strict';

	return {
		// ==================== AUTHENTICATION ====================
		AUTH: {
			TOKEN_STORAGE_KEY: 'sgai-token',
			REFRESH_TOKEN_STORAGE_KEY: 'sgai-refresh-token',
			SESSION_STORAGE_KEY: 'sgai-session-id',
			USER_STORAGE_KEY: 'sgai-user',
			AVATAR_STORAGE_KEY: 'sgai-user-avatar-url',
			TOKEN_EXPIRY_BUFFER_SECONDS: 60,
			MAX_LOGIN_ATTEMPTS: 5,
			LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
			SESSION_TIMEOUT_MS: 24 * 60 * 60 * 1000, // 24 hours
			DEMO_TOKEN: 'demo-token'
		},

		// ==================== SUBSCRIPTION TIERS ====================
		SUBSCRIPTION: {
			TIERS: {
				SURVIVOR: 'survivor',
				HUNTER: 'hunter',
				ELDER: 'elder'
			},
			BILLING_CYCLES: {
				MONTHLY: 'monthly',
				ANNUAL: 'annual'
			},
			PRICES_USD: {
				SURVIVOR: { MONTHLY: 2.99, ANNUAL: 29.99 },
				HUNTER: { MONTHLY: 4.99, ANNUAL: 49.99 },
				ELDER: { MONTHLY: 7.99, ANNUAL: 79.99 }
			},
			TRIAL_PERIOD_DAYS: 7,
			MAX_GIFTS_PER_DAY: 5,
			REFERRAL_BONUS_PERCENT: 20
		},

		// ==================== BATTLE PASS ====================
		BATTLE_PASS: {
			MAX_TIER: 100,
			XP_PER_TIER: 1000,
			DAILY_LOGIN_XP: 100,
			DAILY_LOGIN_STREAK_BONUS: 0.1, // 10% per streak day
			MAX_STREAK_BONUS: 1.0, // Cap at 100% bonus
			SEASON_DURATION_DAYS: 90,
			TEAM_MAX_MEMBERS: 5,
			DAILY_TEAM_XP_CAP: 5000
		},

		// ==================== GAME CONSTANTS ====================
		GAME: {
			FPS_TARGET: 60,
			FPS_MIN: 30,
			FRAME_TIME_MS: 16.67, // 1000/60
			MAX_DELTA_TIME_MS: 100, // Cap delta time to prevent spiral
			PHYSICS_TICK_RATE: 60,
			AUDIO_SAMPLE_RATE: 44100,
			AUDIO_BUFFER_SIZE: 2048,
			MAX_AUDIO_SOURCES: 32,
			TEXTURE_QUALITY: {
				LOW: 512,
				MEDIUM: 1024,
				HIGH: 2048,
				ULTRA: 4096
			},
			DRAW_DISTANCE: {
				LOW: 50,
				MEDIUM: 100,
				HIGH: 200,
				ULTRA: 500
			}
		},

		// ==================== DIFFICULTY SETTINGS ====================
		DIFFICULTY: {
			PEACEFUL: {
				multiplier: 0.5,
				enemySpeed: 0.7,
				damageTaken: 0.5,
				resourceDropRate: 2.0
			},
			EASY: {
				multiplier: 0.75,
				enemySpeed: 0.85,
				damageTaken: 0.75,
				resourceDropRate: 1.5
			},
			NORMAL: {
				multiplier: 1.0,
				enemySpeed: 1.0,
				damageTaken: 1.0,
				resourceDropRate: 1.0
			},
			HARD: {
				multiplier: 1.5,
				enemySpeed: 1.2,
				damageTaken: 1.5,
				resourceDropRate: 0.75
			},
			IMPOSSIBLE: {
				multiplier: 2.0,
				enemySpeed: 1.5,
				damageTaken: 2.0,
				resourceDropRate: 0.5
			}
		},

		// ==================== ECONOMY ====================
		ECONOMY: {
			CURRENCIES: {
				COINS: 'coins',
				GEMS: 'gems',
				SOULS: 'souls',
				GEM_DUST: 'gemDust',
				BLOOD_GEMS: 'bloodGems'
			},
			MAX_CURRENCY_CAP: 999999999,
			MIN_TRANSACTION_AMOUNT: 1,
			MAX_TRANSACTION_AMOUNT: 1000000,
			DAILY_CLAIM_LIMIT: 1000,
			WEEKLY_CLAIM_LIMIT: 5000,
			MARKETPLACE_FEE_RATE: 0.05, // 5%
			AUCTION_MIN_DURATION_HOURS: 1,
			AUCTION_MAX_DURATION_DAYS: 30,
			AUCTION_EXTENSION_MINUTES: 5
		},

		// ==================== ACHIEVEMENTS ====================
		ACHIEVEMENTS: {
			TIERS: {
				BRONZE: 'bronze',
				SILVER: 'silver',
				GOLD: 'gold',
				PLATINUM: 'platinum'
			},
			REWARDS: {
				BRONZE: { souls: 100, gemDust: 5, bloodGems: 0 },
				SILVER: { souls: 500, gemDust: 15, bloodGems: 0 },
				GOLD: { souls: 2000, gemDust: 0, bloodGems: 50 },
				PLATINUM: { souls: 10000, gemDust: 0, bloodGems: 200 }
			},
			MAX_DAILY_ACHIEVEMENTS: 10,
			HIDDEN_ACHIEVEMENT_MULTIPLIER: 2.0
		},

		// ==================== SOCIAL ====================
		SOCIAL: {
			MAX_FRIENDS: 500,
			MAX_GUILD_MEMBERS: 50,
			MAX_MESSAGE_LENGTH: 500,
			MAX_GUILD_NAME_LENGTH: 32,
			MAX_USERNAME_LENGTH: 24,
			MIN_USERNAME_LENGTH: 3,
			LEADERBOARD_PAGE_SIZE: 50,
			ACTIVITY_FEED_MAX_ITEMS: 100,
			GIFT_MESSAGE_MAX_LENGTH: 240
		},

		// ==================== PERFORMANCE ====================
		PERFORMANCE: {
			MEMORY_WARNING_THRESHOLD_MB: 800,
			MEMORY_CRITICAL_THRESHOLD_MB: 950,
			FPS_WARNING_THRESHOLD: 30,
			FPS_CRITICAL_THRESHOLD: 15,
			LOADING_TIMEOUT_MS: 30000,
			API_TIMEOUT_MS: 10000,
			CACHE_MAX_SIZE_MB: 100,
			CACHE_MAX_AGE_MS: 24 * 60 * 60 * 1000, // 24 hours
			GC_INTERVAL_MS: 60000 // 1 minute
		},

		// ==================== UI/UX ====================
		UI: {
			ANIMATION_DURATION_MS: 300,
			TOAST_DURATION_MS: 3000,
			MODAL_ANIMATION_MS: 200,
			SCROLL_THRESHOLD_PX: 100,
			DEBOUNCE_DELAY_MS: 300,
			THROTTLE_DELAY_MS: 100,
			TOOLTIP_DELAY_MS: 500,
			AUTO_HIDE_DELAY_MS: 5000,
			MIN_TOUCH_TARGET_PX: 44,
			BREAKPOINTS: {
				MOBILE: 480,
				TABLET: 768,
				DESKTOP: 1024,
				WIDE: 1440
			}
		},

		// ==================== API/RATE LIMITING ====================
		API: {
			BASE_URL: '/api',
			VERSION: 'v1',
			RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
			RATE_LIMIT_MAX_REQUESTS: 100,
			RATE_LIMIT_AUTHENTICATED: 500,
			RATE_LIMIT_PREMIUM: 1000,
			MAX_PAGE_SIZE: 100,
			DEFAULT_PAGE_SIZE: 20,
			MIN_PAGE_SIZE: 1,
			IDEMPOTENCY_KEY_HEADER: 'idempotency-key',
			REQUEST_ID_HEADER: 'x-request-id'
		},

		// ==================== SECURITY ====================
		SECURITY: {
			MAX_PASSWORD_LENGTH: 128,
			MIN_PASSWORD_LENGTH: 8,
			MAX_EMAIL_LENGTH: 254,
			ALLOWED_SORT_COLUMNS: new Set([
				'created_at', 'updated_at', 'price', 'rarity',
				'views', 'favorites', 'name', 'rating'
			]),
			ALLOWED_ORDER: new Set(['ASC', 'DESC', 'asc', 'desc']),
			CSP_REPORT_URI: '/api/security/csp-report',
			MAX_UPLOAD_SIZE_MB: 10,
			ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
		},

		// ==================== SAVE SYSTEM ====================
		SAVE: {
			MAX_SAVE_SLOTS: 10,
			AUTO_SAVE_INTERVAL_MS: 60000, // 1 minute
			MAX_SAVE_SIZE_KB: 512,
			COMPRESSION_ENABLED: true,
			CLOUD_SYNC_ENABLED: true,
			VERSION: 1,
			CHECKSUM_ALGORITHM: 'sha256'
		},

		// ==================== MISC ====================
		MISC: {
			MS_PER_SECOND: 1000,
			SECONDS_PER_MINUTE: 60,
			MINUTES_PER_HOUR: 60,
			HOURS_PER_DAY: 24,
			DAYS_PER_WEEK: 7,
			DAYS_PER_MONTH: 30,
			DAYS_PER_YEAR: 365,
			MS_PER_DAY: 24 * 60 * 60 * 1000,
			MS_PER_WEEK: 7 * 24 * 60 * 60 * 1000,
			MS_PER_MONTH: 30 * 24 * 60 * 60 * 1000,
			MS_PER_YEAR: 365 * 24 * 60 * 60 * 1000
		}
	};
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
	module.exports = SGAIConstants;
}

// Make globally available in browser
if (typeof window !== 'undefined') {
	window.SGAIConstants = SGAIConstants;
}
