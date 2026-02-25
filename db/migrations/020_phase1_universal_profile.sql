-- Phase 1.1: Universal Player Profile System
-- Cross-game meta-progression with prestige, soul fragments, and legacy achievements
-- Migration 020 - Created: February 19, 2026

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CORE PROFILE TABLES
CREATE TABLE IF NOT EXISTS player_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    avatar_url VARCHAR(512) DEFAULT '/assets/default-avatar.png',
    avatar_frame VARCHAR(100) DEFAULT 'default_frame',
    master_level INTEGER DEFAULT 1 CHECK (master_level >= 1),
    master_xp BIGINT DEFAULT 0,
    master_xp_to_next_level BIGINT DEFAULT 1000,
    prestige_rank INTEGER DEFAULT 0 CHECK (prestige_rank >= 0 AND prestige_rank <= 100),
    prestige_title VARCHAR(100) DEFAULT 'Initiate',
    soul_fragments INTEGER DEFAULT 0,
    earned_soul_fragments BIGINT DEFAULT 0,
    spent_soul_fragments BIGINT DEFAULT 0,
    total_games_played INTEGER DEFAULT 0,
    total_playtime_seconds BIGINT DEFAULT 0,
    friend_code VARCHAR(12) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_mastery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_profile_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
    game_id VARCHAR(100) NOT NULL,
    mastery_level INTEGER DEFAULT 1,
    mastery_xp BIGINT DEFAULT 0,
    playtime_seconds BIGINT DEFAULT 0,
    sessions_count INTEGER DEFAULT 0,
    last_played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_game_mastery UNIQUE (player_profile_id, game_id)
);

CREATE TABLE IF NOT EXISTS prestige_titles (
    rank INTEGER PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    reward_type VARCHAR(50) NOT NULL,
    reward_value JSONB NOT NULL,
    requirement_xp BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS shared_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_profile_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
    item_id VARCHAR(100) NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    item_name VARCHAR(200) NOT NULL,
    item_rarity VARCHAR(50) DEFAULT 'common',
    equip_slot VARCHAR(50),
    is_equipped BOOLEAN DEFAULT FALSE,
    quantity INTEGER DEFAULT 1,
    acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS player_friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_profile_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
    friend_profile_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'accepted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_friendship UNIQUE (player_profile_id, friend_profile_id)
);

CREATE TABLE IF NOT EXISTS friend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_profile_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
    recipient_profile_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS guilds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    tag VARCHAR(10) NOT NULL UNIQUE,
    leader_profile_id UUID REFERENCES player_profiles(id),
    level INTEGER DEFAULT 1,
    member_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guild_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
    player_profile_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_guild_member UNIQUE (guild_id, player_profile_id)
);

-- INDEXES
CREATE INDEX idx_player_profiles_user_id ON player_profiles(user_id);
CREATE INDEX idx_player_profiles_friend_code ON player_profiles(friend_code);
CREATE INDEX idx_game_mastery_player ON game_mastery(player_profile_id);
CREATE INDEX idx_shared_inventory_player ON shared_inventory(player_profile_id);
CREATE INDEX idx_player_friends_player ON player_friends(player_profile_id);

-- TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_player_profiles_updated_at
    BEFORE UPDATE ON player_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- SEED DATA
INSERT INTO prestige_titles (rank, title, description, reward_type, reward_value, requirement_xp) VALUES
(1, 'Initiate', 'First step into the darkness', 'currency', '{"soul_fragments": 100}', 10000),
(2, 'Seeker', 'You seek what lies beneath', 'cosmetic', '{"frame": "seeker_frame"}', 25000),
(3, 'Explorer', 'The shadows reveal themselves', 'title', '{"title": "Explorer"}', 50000),
(4, 'Survivor', 'You have endured', 'currency', '{"soul_fragments": 250}', 100000),
(5, 'Hunter', 'Now you hunt the darkness', 'ability', '{"ability": "night_vision"}', 200000);

-- Migration complete
