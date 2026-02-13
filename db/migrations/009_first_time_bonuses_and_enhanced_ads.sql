-- ScaryGamesAI PostgreSQL schema for First-Time Bonuses and Enhanced Ads
-- Phase: Store Improvements

-- ═══════════════════════════════════════════════════════════════
-- FIRST-TIME BONUSES TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS first_time_bonuses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bonus_type TEXT NOT NULL,
    game_id TEXT,
    souls_reward INTEGER NOT NULL DEFAULT 0 CHECK (souls_reward >= 0),
    blood_gems_reward INTEGER NOT NULL DEFAULT 0 CHECK (blood_gems_reward >= 0),
    horror_coins_reward INTEGER NOT NULL DEFAULT 0 CHECK (horror_coins_reward >= 0),
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    idempotency_key TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, bonus_type, COALESCE(game_id, ''))
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_first_time_bonuses_user
    ON first_time_bonuses(user_id, bonus_type);

-- Index for checking if specific game bonus was claimed
CREATE INDEX IF NOT EXISTS idx_first_time_bonuses_user_game
    ON first_time_bonuses(user_id, bonus_type, game_id);

-- ═══════════════════════════════════════════════════════════════
-- ENHANCED AD WATCH SESSIONS
-- ═══════════════════════════════════════════════════════════════

-- Add new columns to ad_watch_sessions if they don't exist
DO $$
BEGIN
    -- Add reward_type column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ad_watch_sessions' AND column_name = 'reward_type'
    ) THEN
        ALTER TABLE ad_watch_sessions ADD COLUMN reward_type TEXT NOT NULL DEFAULT 'coins';
    END IF;

    -- Rename reward_coins to reward_amount for flexibility (if not already done)
    -- We'll keep both for backwards compatibility but use reward_amount going forward
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'ad_watch_sessions' AND column_name = 'reward_amount'
    ) THEN
        ALTER TABLE ad_watch_sessions ADD COLUMN reward_amount INTEGER;
        UPDATE ad_watch_sessions SET reward_amount = reward_coins WHERE reward_amount IS NULL;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- AD DAILY CHESTS TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ad_daily_chests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chest_type TEXT NOT NULL DEFAULT 'common',
    rewards JSONB NOT NULL DEFAULT '{}'::jsonb,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    idempotency_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, DATE(created_at))
);

-- Index for checking if user claimed chest today
CREATE INDEX IF NOT EXISTS idx_ad_daily_chests_user_date
    ON ad_daily_chests(user_id, DATE(created_at));

-- ═══════════════════════════════════════════════════════════════
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- ═══════════════════════════════════════════════════════════════

-- Index for counting completed ads today (for streak/chest calculations)
CREATE INDEX IF NOT EXISTS idx_ad_watch_sessions_user_completed_today
    ON ad_watch_sessions(user_id, status, completed_at)
    WHERE status = 'completed';

-- ═══════════════════════════════════════════════════════════════
-- GEM DUST BALANCE (Optional - for gem dust accumulation)
-- ═══════════════════════════════════════════════════════════════

-- Add gem_dust column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'gem_dust'
    ) THEN
        ALTER TABLE users ADD COLUMN gem_dust INTEGER NOT NULL DEFAULT 0 CHECK (gem_dust >= 0);
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- COMMENTS FOR DOCUMENTATION
-- ═══════════════════════════════════════════════════════════════

COMMENT ON TABLE first_time_bonuses IS 'Tracks first-time bonus claims for users: first game, first win per game, first referral, first marketplace sale, etc.';
COMMENT ON TABLE ad_daily_chests IS 'Daily chest rewards unlocked after watching 10 ads';
COMMENT ON COLUMN ad_watch_sessions.reward_type IS 'Type of reward: coins, souls, or gem_dust';
COMMENT ON COLUMN ad_watch_sessions.reward_amount IS 'Amount of reward given (in the currency specified by reward_type)';
COMMENT ON COLUMN users.gem_dust IS 'Accumulated gem dust that converts to blood gems at 100:1 ratio';
