-- Phase 3: Premium Battle Pass Evolution & Crafting System
-- Created: 2026-02-17
-- Description: Multi-tier battle pass, mini-games, cosmetic crafting

-- ============================================
-- MULTI-TIER BATTLE PASS SYSTEM
-- ============================================

-- Battle Pass Seasons
CREATE TABLE IF NOT EXISTS battle_pass_seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_number INTEGER UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    theme VARCHAR(255),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    max_tier INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Battle Pass Tiers with Multi-Track Rewards
CREATE TABLE IF NOT EXISTS battle_pass_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
    tier_number INTEGER NOT NULL,
    free_reward JSONB DEFAULT '{}'::jsonb,
    premium_reward JSONB DEFAULT '{}'::jsonb,
    elite_reward JSONB DEFAULT '{}'::jsonb,
    clan_reward JSONB DEFAULT '{}'::jsonb,
    mini_game_unlock BOOLEAN DEFAULT FALSE,
    boss_challenge_unlock BOOLEAN DEFAULT FALSE,
    UNIQUE(season_id, tier_number)
);

-- User Battle Pass Progress (Multi-Track)
CREATE TABLE IF NOT EXISTS user_battle_pass (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
    free_track_level INTEGER DEFAULT 1,
    free_track_xp INTEGER DEFAULT 0,
    premium_track_level INTEGER DEFAULT 1,
    premium_track_xp INTEGER DEFAULT 0,
    elite_track_level INTEGER DEFAULT 1,
    elite_track_xp INTEGER DEFAULT 0,
    clan_track_level INTEGER DEFAULT 1,
    clan_track_xp INTEGER DEFAULT 0,
    premium_pass BOOLEAN DEFAULT FALSE,
    elite_pass BOOLEAN DEFAULT FALSE,
    tiers_claimed JSONB DEFAULT '[]'::jsonb, -- Array of claimed tier numbers
    xp_boosters_active JSONB DEFAULT '[]'::jsonb, -- Active booster data
    challenge_skips_available INTEGER DEFAULT 0,
    tier_jumps_used INTEGER DEFAULT 0,
    purchased_at TIMESTAMPTZ,
    elite_purchased_at TIMESTAMPTZ,
    UNIQUE(user_id, season_id)
);

-- Battle Pass Challenges (Dynamic)
CREATE TABLE IF NOT EXISTS battle_pass_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
    challenge_type VARCHAR(50) NOT NULL, -- daily, weekly, seasonal, event
    name VARCHAR(255) NOT NULL,
    description TEXT,
    objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
    xp_reward INTEGER NOT NULL,
    tier_bonus INTEGER DEFAULT 0,
    difficulty VARCHAR(50) DEFAULT 'normal', -- easy, normal, hard, extreme
    is_premium_only BOOLEAN DEFAULT FALSE,
    is_elite_only BOOLEAN DEFAULT FALSE,
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    completion_limit INTEGER DEFAULT 1, -- Max completions per user
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Challenge Progress
CREATE TABLE IF NOT EXISTS user_challenge_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES battle_pass_challenges(id) ON DELETE CASCADE,
    progress JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of objective progress
    completions INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT FALSE,
    xp_claimed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    UNIQUE(user_id, challenge_id)
);

-- ============================================
-- BATTLE PASS MINI-GAMES & BOSS BATTLES
-- ============================================

-- Mini-Game Definitions
CREATE TABLE IF NOT EXISTS mini_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    game_type VARCHAR(50) NOT NULL, -- survival, puzzle, boss_battle, time_trial
    difficulty VARCHAR(50) DEFAULT 'normal',
    duration_seconds INTEGER DEFAULT 300,
    unlock_tier INTEGER, -- Tier required to unlock
    season_id UUID REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    rewards JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Mini-Game Progress
CREATE TABLE IF NOT EXISTS user_mini_game_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mini_game_id UUID NOT NULL REFERENCES mini_games(id) ON DELETE CASCADE,
    best_score INTEGER DEFAULT 0,
    completions INTEGER DEFAULT 0,
    fastest_time INTEGER, -- In seconds
    stars_earned INTEGER DEFAULT 0, -- 0-3 stars
    last_played_at TIMESTAMPTZ,
    rewards_claimed JSONB DEFAULT '[]'::jsonb,
    UNIQUE(user_id, mini_game_id)
);

-- Boss Battle Instances
CREATE TABLE IF NOT EXISTS boss_battles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
    boss_key VARCHAR(100) UNIQUE NOT NULL,
    boss_name VARCHAR(255) NOT NULL,
    boss_description TEXT,
    boss_health INTEGER NOT NULL,
    boss_difficulty VARCHAR(50) DEFAULT 'normal',
    unlock_tier INTEGER NOT NULL,
    time_limit_seconds INTEGER DEFAULT 600,
    rewards JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Boss Battle Attempts
CREATE TABLE IF NOT EXISTS user_boss_battle_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    boss_battle_id UUID NOT NULL REFERENCES boss_battles(id) ON DELETE CASCADE,
    damage_dealt INTEGER DEFAULT 0,
    was_victorious BOOLEAN DEFAULT FALSE,
    time_taken INTEGER, -- In seconds
    attempt_number INTEGER DEFAULT 1,
    rewards_earned JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guild Boss Battles (Collaborative)
CREATE TABLE IF NOT EXISTS guild_boss_battles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    boss_battle_id UUID NOT NULL REFERENCES boss_battles(id) ON DELETE CASCADE,
    total_damage_dealt INTEGER DEFAULT 0,
    is_defeated BOOLEAN DEFAULT FALSE,
    participants JSONB DEFAULT '[]'::jsonb, -- Array of {user_id, damage}
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    rewards_distributed BOOLEAN DEFAULT FALSE
);

-- ============================================
-- COSMETIC CRAFTING SYSTEM
-- ============================================

-- Essence Types (from dissolving items)
CREATE TABLE IF NOT EXISTS essence_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    essence_key VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(50), -- Visual representation
    rarity_source VARCHAR(50), -- common, uncommon, rare, epic, legendary
    base_value INTEGER DEFAULT 1, -- Base crafting value
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Essence Inventory
CREATE TABLE IF NOT EXISTS user_essence_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    essence_type_id UUID NOT NULL REFERENCES essence_types(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, essence_type_id)
);

-- Crafting Recipes
CREATE TABLE IF NOT EXISTS crafting_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_key VARCHAR(100) UNIQUE NOT NULL,
    recipe_type VARCHAR(50) NOT NULL, -- craft, upgrade, transmog, dismantle
    output_item JSONB NOT NULL, -- {item_id, item_type, rarity}
    ingredients JSONB NOT NULL, -- Array of {essence_type_id, quantity} or {item_id, quantity}
    gem_cost INTEGER DEFAULT 0,
    coin_cost INTEGER DEFAULT 0,
    craft_time_seconds INTEGER DEFAULT 0, -- 0 = instant
    required_tier INTEGER DEFAULT 1, -- Battle pass tier requirement
    is_discovered BOOLEAN DEFAULT TRUE,
    discovery_condition JSONB, -- How to unlock recipe
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Crafting Progress
CREATE TABLE IF NOT EXISTS user_crafting_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES crafting_recipes(id) ON DELETE CASCADE,
    times_crafted INTEGER DEFAULT 0,
    is_unlocked BOOLEAN DEFAULT FALSE,
    last_crafted_at TIMESTAMPTZ,
    UNIQUE(user_id, recipe_id)
);

-- Crafting Queue
CREATE TABLE IF NOT EXISTS crafting_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES crafting_recipes(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- in_progress, completed, cancelled
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completes_at TIMESTAMPTZ NOT NULL,
    result_item JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transmog Collections (Unlocked Appearances)
CREATE TABLE IF NOT EXISTS user_transmog_collection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_appearance_key VARCHAR(255) NOT NULL, -- Appearance identifier
    item_name VARCHAR(255) NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    unlock_source VARCHAR(50) DEFAULT 'crafting', -- crafting, drop, achievement
    usage_count INTEGER DEFAULT 0,
    UNIQUE(user_id, item_appearance_key)
);

-- ============================================
-- BATTLE PASS ACCELERATION
-- ============================================

-- XP Booster Items
CREATE TABLE IF NOT EXISTS xp_boosters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booster_key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    booster_type VARCHAR(50) NOT NULL, -- percentage, flat, time_based
    boost_value INTEGER NOT NULL, -- Percentage or flat amount
    duration_minutes INTEGER, -- For time-based boosters
    gem_cost INTEGER NOT NULL,
    max_uses INTEGER DEFAULT 1,
    is_stackable BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User XP Booster Usage
CREATE TABLE IF NOT EXISTS user_xp_boosters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booster_id UUID NOT NULL REFERENCES xp_boosters(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT FALSE,
    activated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    uses_remaining INTEGER,
    UNIQUE(user_id, booster_id)
);

-- Tier Jump Bundles
CREATE TABLE IF NOT EXISTS tier_jump_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    tier_count INTEGER NOT NULL, -- Number of tiers to jump
    gem_cost INTEGER NOT NULL,
    coin_cost INTEGER DEFAULT 0,
    bonus_rewards JSONB DEFAULT '[]'::jsonb, -- Extra rewards for bulk purchase
    max_purchases_per_season INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Tier Jump Purchases
CREATE TABLE IF NOT EXISTS user_tier_jumps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
    bundle_id UUID REFERENCES tier_jump_bundles(id) ON DELETE SET NULL,
    tiers_purchased INTEGER NOT NULL,
    track_type VARCHAR(50) NOT NULL, -- free, premium, elite
    gem_cost INTEGER DEFAULT 0,
    coin_cost INTEGER DEFAULT 0,
    purchased_at TIMESTAMPTZ DEFAULT NOW()
);

-- Catch-Up Mechanics Configuration
CREATE TABLE IF NOT EXISTS catch_up_mechanics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
    mechanic_type VARCHAR(50) NOT NULL, -- xp_bonus, double_weekend, catch_up_tier
    multiplier DECIMAL(5,2) DEFAULT 1.0,
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BATTLE PASS EXCLUSIVE MODES & EVENTS
-- ============================================

-- Exclusive Game Modes
CREATE TABLE IF NOT EXISTS exclusive_game_modes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mode_key VARCHAR(100) UNIQUE NOT NULL,
    mode_name VARCHAR(255) NOT NULL,
    description TEXT,
    required_pass_tier VARCHAR(50), -- free, premium, elite
    season_id UUID REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    schedule JSONB, -- When mode is available
    rewards JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Battle Pass Events
CREATE TABLE IF NOT EXISTS battle_pass_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- double_xp, bonus_challenge, exclusive_drop
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    rewards JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Battle Pass indexes
CREATE INDEX IF NOT EXISTS idx_battle_pass_seasons_active ON battle_pass_seasons(is_active);
CREATE INDEX IF NOT EXISTS idx_battle_pass_seasons_dates ON battle_pass_seasons(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_battle_pass_tiers_season ON battle_pass_tiers(season_id);
CREATE INDEX IF NOT EXISTS idx_user_battle_pass_user ON user_battle_pass(user_id);
CREATE INDEX IF NOT EXISTS idx_user_battle_pass_season ON user_battle_pass(season_id);
CREATE INDEX IF NOT EXISTS idx_user_battle_pass_active ON user_battle_pass(user_id, season_id) WHERE premium_pass = TRUE OR elite_pass = TRUE;

-- Challenge indexes
CREATE INDEX IF NOT EXISTS idx_battle_pass_challenges_season ON battle_pass_challenges(season_id);
CREATE INDEX IF NOT EXISTS idx_battle_pass_challenges_type ON battle_pass_challenges(challenge_type, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_user ON user_challenge_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_challenge ON user_challenge_progress(challenge_id);

-- Mini-game indexes
CREATE INDEX IF NOT EXISTS idx_mini_games_season ON mini_games(season_id);
CREATE INDEX IF NOT EXISTS idx_mini_games_active ON mini_games(is_active);
CREATE INDEX IF NOT EXISTS idx_user_mini_game_progress_user ON user_mini_game_progress(user_id);

-- Boss battle indexes
CREATE INDEX IF NOT EXISTS idx_boss_battles_season ON boss_battles(season_id);
CREATE INDEX IF NOT EXISTS idx_boss_battles_active ON boss_battles(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_boss_battle_attempts_user ON user_boss_battle_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_guild_boss_battles_guild ON guild_boss_battles(guild_id);

-- Crafting indexes
CREATE INDEX IF NOT EXISTS idx_essence_types_key ON essence_types(essence_key);
CREATE INDEX IF NOT EXISTS idx_user_essence_inventory_user ON user_essence_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_crafting_recipes_type ON crafting_recipes(recipe_type);
CREATE INDEX IF NOT EXISTS idx_user_crafting_progress_user ON user_crafting_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_crafting_queue_user ON crafting_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_transmog_collection_user ON user_transmog_collection(user_id);

-- Acceleration indexes
CREATE INDEX IF NOT EXISTS idx_xp_boosters_active ON xp_boosters(is_active);
CREATE INDEX IF NOT EXISTS idx_user_xp_boosters_user ON user_xp_boosters(user_id);
CREATE INDEX IF NOT EXISTS idx_tier_jump_bundles_active ON tier_jump_bundles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_tier_jumps_user ON user_tier_jumps(user_id, season_id);
CREATE INDEX IF NOT EXISTS idx_catch_up_mechanics_season ON catch_up_mechanics(season_id, is_active);

-- Exclusive modes indexes
CREATE INDEX IF NOT EXISTS idx_exclusive_game_modes_season ON exclusive_game_modes(season_id);
CREATE INDEX IF NOT EXISTS idx_battle_pass_events_season ON battle_pass_events(season_id);

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE battle_pass_seasons IS 'Battle pass season definitions with dates and themes';
COMMENT ON TABLE battle_pass_tiers IS 'Individual tiers with multi-track rewards (free/premium/elite/clan)';
COMMENT ON TABLE user_battle_pass IS 'User progress across all battle pass tracks';
COMMENT ON TABLE battle_pass_challenges IS 'Dynamic challenges with XP and tier rewards';
COMMENT ON TABLE user_challenge_progress IS 'User challenge completion and XP claiming';

COMMENT ON TABLE mini_games IS 'Mini-game definitions for battle pass progression';
COMMENT ON TABLE user_mini_game_progress IS 'User mini-game scores and rewards';
COMMENT ON TABLE boss_battles IS 'Boss battle instances with difficulty and rewards';
COMMENT ON TABLE user_boss_battle_attempts IS 'User boss battle attempts and damage';
COMMENT ON TABLE guild_boss_battles IS 'Collaborative guild boss battles';

COMMENT ON TABLE essence_types IS 'Essence types obtained from dissolving items';
COMMENT ON TABLE user_essence_inventory IS 'User essence currency for crafting';
COMMENT ON TABLE crafting_recipes IS 'Crafting, upgrade, and transmog recipes';
COMMENT ON TABLE user_crafting_progress IS 'User recipe unlocks and craft counts';
COMMENT ON TABLE crafting_queue IS 'Timed crafting queue system';
COMMENT ON TABLE user_transmog_collection IS 'Unlocked appearance collection for transmog';

COMMENT ON TABLE xp_boosters IS 'XP booster items for battle pass acceleration';
COMMENT ON TABLE user_xp_boosters IS 'User owned and active XP boosters';
COMMENT ON TABLE tier_jump_bundles IS 'Tier skip bundles for instant progression';
COMMENT ON TABLE user_tier_jumps IS 'User tier jump purchase history';
COMMENT ON TABLE catch_up_mechanics IS 'Catch-up mechanics for late season joiners';

COMMENT ON TABLE exclusive_game_modes IS 'Battle pass exclusive game modes';
COMMENT ON TABLE battle_pass_events IS 'Special battle pass events with bonuses';

-- ============================================
-- SEED DATA
-- ============================================

-- Insert essence types
INSERT INTO essence_types (essence_key, name, description, color, rarity_source, base_value) VALUES
    (gen_random_uuid(), 'common_essence', 'Common Essence', 'Obtained from dissolving common items', '#888888', 'common', 1),
    (gen_random_uuid(), 'uncommon_essence', 'Uncommon Essence', 'Obtained from dissolving uncommon items', '#22c55e', 'uncommon', 2),
    (gen_random_uuid(), 'rare_essence', 'Rare Essence', 'Obtained from dissolving rare items', '#3b82f6', 'rare', 5),
    (gen_random_uuid(), 'epic_essence', 'Epic Essence', 'Obtained from dissolving epic items', '#a855f7', 'epic', 10),
    (gen_random_uuid(), 'legendary_essence', 'Legendary Essence', 'Obtained from dissolving legendary items', '#f97316', 'legendary', 25),
    (gen_random_uuid(), 'mythic_essence', 'Mythic Essence', 'Obtained from dissolving mythic items', '#ef4444', 'mythic', 50)
ON CONFLICT (essence_key) DO NOTHING;

-- Insert XP boosters
INSERT INTO xp_boosters (booster_key, name, description, booster_type, boost_value, duration_minutes, gem_cost, max_uses, is_stackable) VALUES
    (gen_random_uuid(), 'small_xp_boost', 'Small XP Boost', 'Gain 25% more XP for 30 minutes', 'percentage', 25, 30, 100, 1, FALSE),
    (gen_random_uuid(), 'medium_xp_boost', 'Medium XP Boost', 'Gain 50% more XP for 1 hour', 'percentage', 50, 60, 250, 1, FALSE),
    (gen_random_uuid(), 'large_xp_boost', 'Large XP Boost', 'Gain 100% more XP for 2 hours', 'percentage', 100, 120, 500, 1, FALSE),
    (gen_random_uuid(), 'instant_xp_boost', 'Instant XP Boost', 'Gain 500 XP instantly', 'flat', 500, NULL, 150, 5, TRUE),
    (gen_random_uuid(), 'weekend_warrior', 'Weekend Warrior', 'Double XP all weekend', 'percentage', 100, 2880, 1000, 1, FALSE)
ON CONFLICT (booster_key) DO NOTHING;

-- Insert tier jump bundles
INSERT INTO tier_jump_bundles (bundle_key, name, tier_count, gem_cost, coin_cost, bonus_rewards, max_purchases_per_season) VALUES
    (gen_random_uuid(), 'tier_skip_5', '5 Tier Skip', 5, 250, 0, '[]', 3),
    (gen_random_uuid(), 'tier_skip_10', '10 Tier Skip', 10, 450, 0, '[{"type": "bonus", "item": "essence", "quantity": 100}]', 2),
    (gen_random_uuid(), 'tier_skip_25', '25 Tier Skip', 25, 1000, 0, '[{"type": "bonus", "item": "essence", "quantity": 300}, {"type": "bonus", "item": "challenge_skip", "quantity": 1}]', 1)
ON CONFLICT (bundle_key) DO NOTHING;

