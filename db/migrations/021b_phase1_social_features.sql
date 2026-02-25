-- Phase 1.3: Enhanced Social Features
-- Guilds, social gifting, and reputation system
-- Migration 021b - Created: February 19, 2026

-- Guild Enhancements
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS motto VARCHAR(200) DEFAULT '';
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS emblem_url VARCHAR(512);
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS experience BIGINT DEFAULT 0;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 50;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS guild_soul_fragments INTEGER DEFAULT 0;
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS join_requirement VARCHAR(20) DEFAULT 'open';

-- Guild Members Enhancements
ALTER TABLE guild_members ADD COLUMN IF NOT EXISTS reputation INTEGER DEFAULT 0;
ALTER TABLE guild_members ADD COLUMN IF NOT EXISTS weekly_xp_contribution INTEGER DEFAULT 0;
ALTER TABLE guild_members ADD COLUMN IF NOT EXISTS total_xp_contribution BIGINT DEFAULT 0;
ALTER TABLE guild_members ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Guild Invitations
CREATE TABLE IF NOT EXISTS guild_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
    player_profile_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
    invited_by_profile_id UUID REFERENCES player_profiles(id),
    status VARCHAR(20) DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Social Gifting
CREATE TABLE IF NOT EXISTS player_gifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_profile_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
    recipient_profile_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
    gift_type VARCHAR(50) NOT NULL,
    item_id VARCHAR(100),
    amount INTEGER DEFAULT 1,
    message TEXT,
    accepted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Player Reputation
CREATE TABLE IF NOT EXISTS player_reputation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_profile_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
    game_id VARCHAR(100),
    positive INTEGER DEFAULT 0,
    negative INTEGER DEFAULT 0,
    neutral INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_reputation UNIQUE (player_profile_id, game_id)
);

-- Group Finder (LFG)
CREATE TABLE IF NOT EXISTS lfg_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leader_profile_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
    game_id VARCHAR(100) NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT,
    min_level INTEGER DEFAULT 1,
    min_rating INTEGER DEFAULT 0,
    slots_total INTEGER DEFAULT 4,
    slots_filled INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'recruiting',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '2 hours')
);

-- LFG Applications
CREATE TABLE IF NOT EXISTS lfg_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES lfg_listings(id) ON DELETE CASCADE,
    applicant_profile_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Friend Recommendations
CREATE TABLE IF NOT EXISTS friend_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_profile_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
    recommended_profile_id UUID REFERENCES player_profiles(id) ON DELETE CASCADE,
    reason VARCHAR(100),
    score DECIMAL DEFAULT 0.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    dismissed BOOLEAN DEFAULT FALSE
);

-- INDEXES
CREATE INDEX idx_guild_invitations_player ON guild_invitations(player_profile_id, status);
CREATE INDEX idx_player_gifts_sender ON player_gifts(sender_profile_id, created_at);
CREATE INDEX idx_player_gifts_recipient ON player_gifts(recipient_profile_id, accepted, created_at);
CREATE INDEX idx_lfg_listings_status ON lfg_listings(status, game_id, created_at);
CREATE INDEX idx_friend_recommendations ON friend_recommendations(player_profile_id, score DESC);

-- Migration complete
