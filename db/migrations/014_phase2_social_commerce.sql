-- Phase 2: Social Commerce & Competitive Economy
-- Created: 2026-02-17
-- Description: Player marketplace, guild/clan system, social gifting

-- ============================================
-- PLAYER MARKETPLACE
-- ============================================

-- Marketplace listings for P2P trading
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    item_id VARCHAR(255) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    item_rarity VARCHAR(50),
    item_metadata JSONB DEFAULT '{}'::jsonb,
    listing_type VARCHAR(50) NOT NULL DEFAULT 'fixed_price',
    price_coins INTEGER NOT NULL DEFAULT 0,
    price_gems INTEGER DEFAULT 0,
    auction_start_price INTEGER,
    auction_reserve_price INTEGER,
    auction_end_time TIMESTAMPTZ,
    highest_bidder_id UUID,
    highest_bid_amount INTEGER,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Bids on auction listings
CREATE TABLE IF NOT EXISTS marketplace_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
    bidder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trade offers between players
CREATE TABLE IF NOT EXISTS trade_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    sender_currency INTEGER DEFAULT 0,
    recipient_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    recipient_currency INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    message TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction history for marketplace
CREATE TABLE IF NOT EXISTS marketplace_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES marketplace_listings(id) ON DELETE SET NULL,
    trade_offer_id UUID REFERENCES trade_offers(id) ON DELETE SET NULL,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    item_id VARCHAR(255) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    price_coins INTEGER DEFAULT 0,
    price_gems INTEGER DEFAULT 0,
    transaction_fee INTEGER DEFAULT 0,
    seller_receives INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price history for market analytics
CREATE TABLE IF NOT EXISTS market_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_type VARCHAR(50) NOT NULL,
    item_id VARCHAR(255) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    price_coins INTEGER NOT NULL,
    price_gems INTEGER DEFAULT 0,
    sold_at TIMESTAMPTZ DEFAULT NOW()
);

-- LIMITED EDITION DROPS

CREATE TABLE IF NOT EXISTS limited_edition_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_key VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    item_type VARCHAR(50) NOT NULL,
    rarity VARCHAR(50) NOT NULL,
    total_supply INTEGER NOT NULL,
    max_per_user INTEGER DEFAULT 1,
    serial_number_prefix VARCHAR(50),
    metadata JSONB DEFAULT '{}'::jsonb,
    drop_date TIMESTAMPTZ NOT NULL,
    sale_end_date TIMESTAMPTZ,
    price_coins INTEGER NOT NULL,
    price_gems INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    purchase_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS limited_edition_ownership (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES limited_edition_items(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    serial_number INTEGER NOT NULL,
    certificate_hash VARCHAR(255) UNIQUE,
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    acquisition_type VARCHAR(50) DEFAULT 'purchase',
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(item_id, serial_number)
);

CREATE TABLE IF NOT EXISTS drop_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES limited_edition_items(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    announcement_type VARCHAR(50) DEFAULT 'upcoming',
    scheduled_time TIMESTAMPTZ NOT NULL,
    is_featured BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GUILD/CLAN SYSTEM

CREATE TABLE IF NOT EXISTS guilds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    tag VARCHAR(10) NOT NULL,
    description TEXT,
    motto VARCHAR(255),
    level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0,
    max_members INTEGER DEFAULT 50,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    treasury_coins INTEGER DEFAULT 0,
    treasury_gems INTEGER DEFAULT 0,
    total_cp_contributed INTEGER DEFAULT 0,
    hall_decoration JSONB DEFAULT '{}'::jsonb,
    region VARCHAR(50),
    is_recruiting BOOLEAN DEFAULT TRUE,
    requirements JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guild_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    contribution_score INTEGER DEFAULT 0,
    weekly_contribution INTEGER DEFAULT 0,
    total_cp_contributed INTEGER DEFAULT 0,
    permissions JSONB DEFAULT '[]'::jsonb,
    UNIQUE(guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS guild_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    message TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guild_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guild_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    challenge_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
    reward_coins INTEGER DEFAULT 0,
    reward_gems INTEGER DEFAULT 0,
    reward_xp INTEGER DEFAULT 0,
    progress INTEGER DEFAULT 0,
    target INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guild_challenge_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES guild_challenges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contribution_amount INTEGER NOT NULL,
    contributed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guild_leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    leaderboard_type VARCHAR(50) NOT NULL,
    score INTEGER NOT NULL,
    rank INTEGER,
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guild_hall_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    item_key VARCHAR(255) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    item_type VARCHAR(50) NOT NULL,
    placement_data JSONB DEFAULT '{}'::jsonb,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    purchased_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- SOCIAL GIFTING 2.0

CREATE TABLE IF NOT EXISTS user_wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    item_id VARCHAR(255) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    priority VARCHAR(50) DEFAULT 'medium',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, item_type, item_id)
);

CREATE TABLE IF NOT EXISTS group_gifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gift_type VARCHAR(50) NOT NULL,
    gift_id VARCHAR(255) NOT NULL,
    gift_name VARCHAR(255) NOT NULL,
    total_cost INTEGER NOT NULL,
    current_amount INTEGER DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'fundraising',
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS group_gift_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_gift_id UUID NOT NULL REFERENCES group_gifts(id) ON DELETE CASCADE,
    contributor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gift_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gift_type VARCHAR(50) NOT NULL,
    gift_id VARCHAR(255) NOT NULL,
    gift_name VARCHAR(255) NOT NULL,
    gift_metadata JSONB DEFAULT '{}'::jsonb,
    message TEXT,
    occasion VARCHAR(50),
    is_wrapped BOOLEAN DEFAULT TRUE,
    wrap_style VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'sent',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS scheduled_gifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gift_type VARCHAR(50) NOT NULL,
    gift_id VARCHAR(255) NOT NULL,
    gift_name VARCHAR(255) NOT NULL,
    scheduled_date DATE NOT NULL,
    occasion VARCHAR(50),
    message TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_pattern VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES

CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller ON marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_type ON marketplace_listings(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_expires ON marketplace_listings(expires_at);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_created ON marketplace_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_bids_listing ON marketplace_bids(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_bids_bidder ON marketplace_bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_sender ON trade_offers(sender_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_recipient ON trade_offers(recipient_id);
CREATE INDEX IF NOT EXISTS idx_trade_offers_status ON trade_offers(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_seller ON marketplace_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_buyer ON marketplace_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_market_price_history_item ON market_price_history(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_limited_edition_items_key ON limited_edition_items(item_key);
CREATE INDEX IF NOT EXISTS idx_limited_edition_items_drop_date ON limited_edition_items(drop_date);
CREATE INDEX IF NOT EXISTS idx_limited_edition_ownership_item ON limited_edition_ownership(item_id);
CREATE INDEX IF NOT EXISTS idx_limited_edition_ownership_owner ON limited_edition_ownership(owner_id);
CREATE INDEX IF NOT EXISTS idx_guilds_key ON guilds(guild_key);
CREATE INDEX IF NOT EXISTS idx_guilds_creator ON guilds(creator_id);
CREATE INDEX IF NOT EXISTS idx_guilds_level ON guilds(level DESC);
CREATE INDEX IF NOT EXISTS idx_guilds_recruiting ON guilds(is_recruiting);
CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON guild_members(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_user ON guild_members(user_id);
CREATE INDEX IF NOT EXISTS idx_guild_challenges_guild ON guild_challenges(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_challenges_status ON guild_challenges(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_wishlists_user ON user_wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_group_gifts_recipient ON group_gifts(recipient_id);
CREATE INDEX IF NOT EXISTS idx_group_gifts_status ON group_gifts(status);
CREATE INDEX IF NOT EXISTS idx_gift_history_sender ON gift_history(sender_id);
CREATE INDEX IF NOT EXISTS idx_gift_history_recipient ON gift_history(recipient_id);
