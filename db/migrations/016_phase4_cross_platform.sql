-- Phase 4: Cross-Platform Progression & Rewards
-- Created: 2026-02-17
-- Description: Universal progression, currency conversion, mobile companion

-- ============================================
-- UNIVERSAL PROGRESSION SYSTEM
-- ============================================

-- Account-Wide Achievements
CREATE TABLE IF NOT EXISTS account_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    achievement_key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- platform_mastery, cumulative, collection, time_based
    difficulty VARCHAR(50) DEFAULT 'normal', -- easy, normal, hard, extreme
    requirement JSONB NOT NULL, -- {type, target, games_required}
    reward_coins INTEGER DEFAULT 0,
    reward_gems INTEGER DEFAULT 0,
    reward_title VARCHAR(255),
    reward_avatar TEXT,
    is_hidden BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Account Achievement Progress
CREATE TABLE IF NOT EXISTS user_account_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES account_achievements(id) ON DELETE CASCADE,
    progress JSONB NOT NULL DEFAULT '{}'::jsonb, -- {game_id: progress_value}
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    reward_claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMPTZ,
    UNIQUE(user_id, achievement_id)
);

-- Platform Mastery Stats (Cross-Game)
CREATE TABLE IF NOT EXISTS platform_mastery_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stat_key VARCHAR(100) NOT NULL,
    stat_value DECIMAL(20,2) DEFAULT 0,
    games_contributed JSONB DEFAULT '[]'::jsonb, -- Array of game_ids
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, stat_key)
);

-- Game-Specific Stats Aggregation
CREATE TABLE IF NOT EXISTS game_stats_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id VARCHAR(100) NOT NULL,
    stat_type VARCHAR(50) NOT NULL, -- kills, deaths, distance, playtime, etc.
    stat_value DECIMAL(20,2) DEFAULT 0,
    sessions_count INTEGER DEFAULT 0,
    last_played_at TIMESTAMPTZ,
    UNIQUE(user_id, game_id, stat_type)
);

-- Collection Tracking (Cross-Game)
CREATE TABLE IF NOT EXISTS collection_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    collection_type VARCHAR(50) NOT NULL, -- skins, effects, emotes, boosters
    item_category VARCHAR(50), -- Optional subcategory
    items_owned JSONB DEFAULT '[]'::jsonb, -- Array of item_ids
    total_collected INTEGER DEFAULT 0,
    collection_percentage DECIMAL(5,2) DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, collection_type, item_category)
);

-- Login Streaks & Time-Based Achievements
CREATE TABLE IF NOT EXISTS user_login_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_login_date DATE DEFAULT CURRENT_DATE,
    total_logins INTEGER DEFAULT 0,
    total_playtime_hours INTEGER DEFAULT 0,
    streak_rewards_claimed JSONB DEFAULT '[]'::jsonb, -- Array of dates
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================
-- CROSS-GAME CURRENCY CONVERSION
-- ============================================

-- Currency Exchange Rates
CREATE TABLE IF NOT EXISTS currency_exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency VARCHAR(50) NOT NULL, -- souls, gems, coins
    to_currency VARCHAR(50) NOT NULL,
    exchange_rate DECIMAL(10,6) NOT NULL,
    inverse_rate DECIMAL(10,6) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Currency Exchange Transactions
CREATE TABLE IF NOT EXISTS currency_exchanges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_currency VARCHAR(50) NOT NULL,
    to_currency VARCHAR(50) NOT NULL,
    from_amount DECIMAL(20,2) NOT NULL,
    to_amount DECIMAL(20,2) NOT NULL,
    exchange_rate DECIMAL(10,6) NOT NULL,
    fee_amount DECIMAL(20,2) DEFAULT 0, -- Transaction fee
    status VARCHAR(50) DEFAULT 'completed', -- completed, pending, failed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Currency Market Events (Special Rates)
CREATE TABLE IF NOT EXISTS currency_market_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- rate_boost, fee_discount, free_exchange
    affected_pairs JSONB NOT NULL, -- Array of {from, to}
    bonus_percentage DECIMAL(5,2) DEFAULT 0,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Arbitrage Mini-Game Market Data
CREATE TABLE IF NOT EXISTS arbitrage_market_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_key VARCHAR(100) UNIQUE NOT NULL,
    currency_pair VARCHAR(50) NOT NULL, -- e.g., "SOULS/GEMS"
    current_rate DECIMAL(10,6) NOT NULL,
    trend VARCHAR(20) DEFAULT 'stable', -- rising, falling, stable
    volatility DECIMAL(5,2) DEFAULT 0, -- Percentage
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- User Arbitrage Portfolio (Mini-Game)
CREATE TABLE IF NOT EXISTS user_arbitrage_portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency_type VARCHAR(50) NOT NULL,
    amount DECIMAL(20,2) DEFAULT 0,
    average_buy_rate DECIMAL(10,6),
    current_value DECIMAL(20,2) DEFAULT 0,
    profit_loss DECIMAL(20,2) DEFAULT 0,
    last_traded_at TIMESTAMPTZ,
    UNIQUE(user_id, currency_type)
);

-- ============================================
-- MOBILE COMPANION APP
-- ============================================

-- Mobile Device Registration
CREATE TABLE IF NOT EXISTS mobile_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    device_type VARCHAR(50) NOT NULL, -- ios, android
    push_token TEXT,
    app_version VARCHAR(50),
    os_version VARCHAR(50),
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);

-- Mobile-Exclusive Challenges
CREATE TABLE IF NOT EXISTS mobile_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    challenge_type VARCHAR(50) NOT NULL, -- daily, weekly, event
    objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
    reward_coins INTEGER DEFAULT 0,
    reward_gems INTEGER DEFAULT 0,
    reward_xp INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    completion_limit INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Mobile Challenge Progress
CREATE TABLE IF NOT EXISTS user_mobile_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES mobile_challenges(id) ON DELETE CASCADE,
    progress JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_completed BOOLEAN DEFAULT FALSE,
    completions INTEGER DEFAULT 0,
    reward_claimed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    UNIQUE(user_id, challenge_id)
);

-- Offline Progress & Idle Earnings
CREATE TABLE IF NOT EXISTS offline_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    progress_type VARCHAR(50) NOT NULL, -- idle_earning, challenge_progress, resource_generation
    progress_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_claimed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idle Earning Configuration
CREATE TABLE IF NOT EXISTS idle_earning_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_key VARCHAR(100) UNIQUE NOT NULL,
    earning_type VARCHAR(50) NOT NULL, -- coins, souls, resources
    base_rate_per_hour DECIMAL(10,2) NOT NULL,
    max_accumulation_hours INTEGER DEFAULT 24,
    requirement_type VARCHAR(50), -- subscription_tier, battle_pass_tier, none
    requirement_value VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Idle Earnings
CREATE TABLE IF NOT EXISTS user_idle_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    earning_type VARCHAR(50) NOT NULL,
    accumulated_amount DECIMAL(20,2) DEFAULT 0,
    hours_accumulated DECIMAL(10,2) DEFAULT 0,
    last_claimed_at TIMESTAMPTZ,
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, earning_type)
);

-- Push Notification Preferences
CREATE TABLE IF NOT EXISTS user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- flash_sales, challenge_expiry, trade_offers, etc.
    is_enabled BOOLEAN DEFAULT TRUE,
    channels JSONB DEFAULT '["push", "email"]', -- push, email, sms
    quiet_hours_start TIME, -- 22:00
    quiet_hours_end TIME, -- 08:00
    timezone VARCHAR(50) DEFAULT 'UTC',
    UNIQUE(user_id, notification_type)
);

-- Push Notification Log
CREATE TABLE IF NOT EXISTS push_notifications_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES mobile_devices(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'pending' -- pending, sent, delivered, opened, failed
);

-- Social Feed Activities
CREATE TABLE IF NOT EXISTS social_feed_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- achievement, purchase, level_up, challenge_complete
    activity_data JSONB NOT NULL,
    visibility VARCHAR(50) DEFAULT 'public', -- public, friends, private
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Social Feed
CREATE TABLE IF NOT EXISTS user_social_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES social_feed_activities(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    is_liked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cross-Platform Sync State
CREATE TABLE IF NOT EXISTS cross_platform_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- web, mobile_ios, mobile_android, desktop
    last_sync_at TIMESTAMPTZ DEFAULT NOW(),
    sync_data JSONB DEFAULT '{}'::jsonb, -- Last synced state
    device_info JSONB,
    UNIQUE(user_id, platform)
);

-- AR Preview Data (Cosmetics in Real World)
CREATE TABLE IF NOT EXISTS ar_preview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    item_id VARCHAR(255) NOT NULL,
    session_duration_seconds INTEGER DEFAULT 0,
    screenshot_taken BOOLEAN DEFAULT FALSE,
    shared_social BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Account achievements indexes
CREATE INDEX IF NOT EXISTS idx_account_achievements_category ON account_achievements(category);
CREATE INDEX IF NOT EXISTS idx_account_achievements_difficulty ON account_achievements(difficulty);
CREATE INDEX IF NOT EXISTS idx_user_account_achievements_user ON user_account_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_account_achievements_completed ON user_account_achievements(user_id, is_completed);

-- Platform mastery indexes
CREATE INDEX IF NOT EXISTS idx_platform_mastery_stats_user ON platform_mastery_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_aggregates_user ON game_stats_aggregates(user_id);
CREATE INDEX IF NOT EXISTS idx_game_stats_aggregates_game ON game_stats_aggregates(game_id);
CREATE INDEX IF NOT EXISTS idx_collection_progress_user ON collection_progress(user_id);

-- Login streaks indexes
CREATE INDEX IF NOT EXISTS idx_user_login_streaks_user ON user_login_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_streaks_streak ON user_login_streaks(current_streak DESC);

-- Currency exchange indexes
CREATE INDEX IF NOT EXISTS idx_currency_exchange_rates_pair ON currency_exchange_rates(from_currency, to_currency, is_active);
CREATE INDEX IF NOT EXISTS idx_currency_exchanges_user ON currency_exchanges(user_id);
CREATE INDEX IF NOT EXISTS idx_currency_exchanges_created ON currency_exchanges(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_currency_market_events_active ON currency_market_events(is_active, starts_at, ends_at);

-- Arbitrage indexes
CREATE INDEX IF NOT EXISTS idx_arbitrage_market_data_pair ON arbitrage_market_data(currency_pair);
CREATE INDEX IF NOT EXISTS idx_user_arbitrage_portfolio_user ON user_arbitrage_portfolio(user_id);

-- Mobile companion indexes
CREATE INDEX IF NOT EXISTS idx_mobile_devices_user ON mobile_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_mobile_challenges_active ON mobile_challenges(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_mobile_challenges_user ON user_mobile_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_progress_user ON offline_progress(user_id, is_claimed);
CREATE INDEX IF NOT EXISTS idx_idle_earning_rates_active ON idle_earning_rates(is_active);
CREATE INDEX IF NOT EXISTS idx_user_idle_earnings_user ON user_idle_earnings(user_id);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user ON user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_log_user ON push_notifications_log(user_id);
CREATE INDEX IF NOT EXISTS idx_push_notifications_log_status ON push_notifications_log(status);

-- Social feed indexes
CREATE INDEX IF NOT EXISTS idx_social_feed_activities_user ON social_feed_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_social_feed_activities_type ON social_feed_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_social_feed_user ON user_social_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_user_social_feed_read ON user_social_feed(user_id, is_read);

-- Cross-platform sync indexes
CREATE INDEX IF NOT EXISTS idx_cross_platform_sync_user ON cross_platform_sync(user_id);
CREATE INDEX IF NOT EXISTS idx_ar_preview_sessions_user ON ar_preview_sessions(user_id);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE account_achievements IS 'Cross-game account-wide achievements';
COMMENT ON TABLE user_account_achievements IS 'User progress on account achievements';
COMMENT ON TABLE platform_mastery_stats IS 'Aggregated stats across all games';
COMMENT ON TABLE game_stats_aggregates IS 'Per-game stat aggregation';
COMMENT ON TABLE collection_progress IS 'Cross-game collection tracking';
COMMENT ON TABLE user_login_streaks IS 'Login streaks and time-based tracking';

COMMENT ON TABLE currency_exchange_rates IS 'Dynamic currency exchange rates';
COMMENT ON TABLE currency_exchanges IS 'User currency exchange transactions';
COMMENT ON TABLE currency_market_events IS 'Special currency market events';
COMMENT ON TABLE arbitrage_market_data IS 'Market data for arbitrage mini-game';
COMMENT ON TABLE user_arbitrage_portfolio IS 'User arbitrage trading portfolio';

COMMENT ON TABLE mobile_devices IS 'Registered mobile devices for users';
COMMENT ON TABLE mobile_challenges IS 'Mobile-exclusive challenges';
COMMENT ON TABLE user_mobile_challenges IS 'User mobile challenge progress';
COMMENT ON TABLE offline_progress IS 'Offline/idle progress tracking';
COMMENT ON TABLE idle_earning_rates IS 'Idle earning rate configurations';
COMMENT ON TABLE user_idle_earnings IS 'User accumulated idle earnings';
COMMENT ON TABLE user_notification_preferences IS 'User push notification settings';
COMMENT ON TABLE push_notifications_log IS 'Push notification delivery tracking';
COMMENT ON TABLE social_feed_activities IS 'Social feed activity stream';
COMMENT ON TABLE user_social_feed IS 'User social feed interactions';
COMMENT ON TABLE cross_platform_sync IS 'Cross-platform sync state tracking';
COMMENT ON TABLE ar_preview_sessions IS 'AR cosmetic preview sessions';

-- ============================================
-- SEED DATA
-- ============================================

-- Insert account achievements
INSERT INTO account_achievements (achievement_key, name, description, category, difficulty, requirement, reward_coins, reward_gems, reward_title) VALUES
    (gen_random_uuid(), 'platform_explorer', 'Platform Explorer', 'Play 5 different games', 'platform_mastery', '{"type": "games_played", "target": 5}', 1000, 50, 'Explorer'),
    (gen_random_uuid(), 'platform_master', 'Platform Master', 'Play 10 different games', 'platform_mastery', '{"type": "games_played", "target": 10}', 2500, 100, 'Master'),
    (gen_random_uuid(), 'centurion', 'Centurion', 'Reach 100 total kills across all games', 'cumulative', '{"type": "kills", "target": 100}', 500, 25, NULL),
    (gen_random_uuid(), 'marathon_runner', 'Marathon Runner', 'Accumulate 100 hours of playtime', 'time_based', '{"type": "playtime_hours", "target": 100}', 5000, 200, 'Marathoner'),
    (gen_random_uuid(), 'collector', 'Collector', 'Own 50 different cosmetics', 'collection', '{"type": "cosmetics_owned", "target": 50}', 1500, 75, 'Collector'),
    (gen_random_uuid(), 'loyal_player', 'Loyal Player', 'Maintain a 30-day login streak', 'time_based', '{"type": "login_streak", "target": 30}', 3000, 150, 'Loyal')
ON CONFLICT (achievement_key) DO NOTHING;

-- Insert currency exchange rates
INSERT INTO currency_exchange_rates (from_currency, to_currency, exchange_rate, inverse_rate) VALUES
    ('souls', 'gems', 0.8, 1.25),
    ('gems', 'souls', 1.25, 0.8),
    ('souls', 'coins', 100, 0.01),
    ('coins', 'souls', 0.01, 100),
    ('gems', 'coins', 125, 0.008),
    ('coins', 'gems', 0.008, 125)
ON CONFLICT DO NOTHING;

-- Insert idle earning rates
INSERT INTO idle_earning_rates (rate_key, earning_type, base_rate_per_hour, max_accumulation_hours, requirement_type) VALUES
    (gen_random_uuid(), 'basic_coins', 50, 24, 'none'),
    (gen_random_uuid(), 'premium_coins', 100, 48, 'subscription_tier'),
    (gen_random_uuid(), 'elite_coins', 200, 72, 'subscription_tier'),
    (gen_random_uuid(), 'battle_pass_souls', 10, 24, 'battle_pass_tier')
ON CONFLICT (rate_key) DO NOTHING;

-- Insert notification preferences defaults
INSERT INTO user_notification_preferences (user_id, notification_type, is_enabled)
SELECT 
    id as user_id,
    unnest(ARRAY['flash_sales', 'challenge_expiry', 'trade_offers', 'guild_invites', 'achievement_unlocked']) as notification_type,
    TRUE as is_enabled
FROM users
ON CONFLICT (user_id, notification_type) DO NOTHING;

