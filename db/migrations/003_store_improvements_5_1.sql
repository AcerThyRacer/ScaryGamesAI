-- ScaryGamesAI PostgreSQL store improvements schema
-- Phase 5 Step 2 (5.1): seasonal store, marketplace, gifting, loyalty, referrals hooks, watch-to-earn

CREATE TABLE IF NOT EXISTS seasonal_store_items (
  id TEXT PRIMARY KEY,
  item_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_coins INTEGER NOT NULL CHECK (price_coins >= 0),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  max_supply INTEGER CHECK (max_supply IS NULL OR max_supply >= 0),
  claimed_count INTEGER NOT NULL DEFAULT 0 CHECK (claimed_count >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketplace_listings (
  id TEXT PRIMARY KEY,
  seller_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  buyer_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  item_key TEXT NOT NULL,
  price_coins INTEGER NOT NULL CHECK (price_coins > 0),
  tax_amount INTEGER NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  seller_net_amount INTEGER NOT NULL DEFAULT 0 CHECK (seller_net_amount >= 0),
  status TEXT NOT NULL DEFAULT 'active',
  sold_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gift_transactions (
  id TEXT PRIMARY KEY,
  gift_type TEXT NOT NULL,
  sender_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_key TEXT,
  subscription_tier TEXT,
  subscription_billing_cycle TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  lifetime_points INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_points >= 0),
  tier TEXT NOT NULL DEFAULT 'bronze',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_claims (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_key TEXT NOT NULL,
  reward_value INTEGER NOT NULL DEFAULT 0 CHECK (reward_value >= 0),
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, reward_key)
);

CREATE TABLE IF NOT EXISTS referral_bonus_events (
  id TEXT PRIMARY KEY,
  referrer_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  bonus_amount INTEGER NOT NULL DEFAULT 0 CHECK (bonus_amount >= 0),
  status TEXT NOT NULL DEFAULT 'qualified',
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  UNIQUE (referred_user_id, trigger_type)
);

CREATE TABLE IF NOT EXISTS ad_watch_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  placement_key TEXT NOT NULL,
  reward_coins INTEGER NOT NULL DEFAULT 0 CHECK (reward_coins >= 0),
  nonce TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'started',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_friendships (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'accepted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, friend_user_id)
);

CREATE INDEX IF NOT EXISTS idx_seasonal_store_items_active_window
  ON seasonal_store_items(is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status_created
  ON marketplace_listings(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller
  ON marketplace_listings(seller_user_id, status);
CREATE INDEX IF NOT EXISTS idx_gift_transactions_sender
  ON gift_transactions(sender_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gift_transactions_recipient
  ON gift_transactions(recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_claims_user
  ON loyalty_claims(user_id, claimed_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_bonus_events_referrer
  ON referral_bonus_events(referrer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_watch_sessions_user_status
  ON ad_watch_sessions(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_friendships_user_status
  ON user_friendships(user_id, status);