-- ScaryGamesAI PostgreSQL baseline schema
-- Phase 1.1 foundation (safe, additive, backwards-compatible)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  email TEXT UNIQUE,
  auth_token TEXT,
  avatar TEXT,
  title TEXT,
  inventory JSONB DEFAULT '[]'::jsonb,
  horror_coins INTEGER DEFAULT 0,
  account_credit INTEGER DEFAULT 0,
  is_eternal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL,
  billing_cycle TEXT,
  status TEXT NOT NULL,
  stripe_session_id TEXT,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  referral_code TEXT,
  started_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  upgraded_from TEXT,
  upgraded_at TIMESTAMPTZ,
  streak_days INTEGER DEFAULT 0,
  total_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS battlepass (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  rewards_claimed JSONB DEFAULT '[]'::jsonb,
  streak_days INTEGER DEFAULT 0,
  last_login TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referrer_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  code TEXT UNIQUE,
  is_master_code BOOLEAN DEFAULT FALSE,
  used BOOLEAN DEFAULT FALSE,
  converted BOOLEAN DEFAULT FALSE,
  converted_user_id TEXT,
  converted_at TIMESTAMPTZ,
  referred_email TEXT,
  clicks INTEGER DEFAULT 0,
  reward_value INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  source TEXT,
  amount INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_goals (
  id TEXT PRIMARY KEY,
  target INTEGER NOT NULL,
  reward TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_battlepass_user_id ON battlepass(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(code);
CREATE INDEX IF NOT EXISTS idx_analytics_user_type ON analytics(user_id, type);
