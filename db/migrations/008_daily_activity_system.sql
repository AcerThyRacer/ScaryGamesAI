-- ScaryGamesAI PostgreSQL Daily Activity System
-- Adds gem dust currency + daily activity progression and weekly crate claims

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS gem_dust INTEGER NOT NULL DEFAULT 0 CHECK (gem_dust >= 0);

CREATE TABLE IF NOT EXISTS daily_activity_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_code TEXT NOT NULL,
  activity_date DATE NOT NULL,
  reward_granted BOOLEAN NOT NULL DEFAULT TRUE,
  reward_amount INTEGER NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, activity_code, activity_date)
);

CREATE TABLE IF NOT EXISTS daily_activity_bonus_claims (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  bonus_amount INTEGER NOT NULL DEFAULT 0 CHECK (bonus_amount >= 0),
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, activity_date)
);

CREATE TABLE IF NOT EXISTS weekly_gem_crate_claims (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  activity_score INTEGER NOT NULL DEFAULT 0 CHECK (activity_score >= 0),
  threshold_required INTEGER NOT NULL DEFAULT 0 CHECK (threshold_required >= 0),
  reward_gem_dust INTEGER NOT NULL DEFAULT 0 CHECK (reward_gem_dust >= 0),
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_activity_progress_user_date
  ON daily_activity_progress(user_id, activity_date);

CREATE INDEX IF NOT EXISTS idx_daily_activity_progress_user_completed_at
  ON daily_activity_progress(user_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_daily_activity_bonus_user_date
  ON daily_activity_bonus_claims(user_id, activity_date);

CREATE INDEX IF NOT EXISTS idx_weekly_gem_crate_user_week
  ON weekly_gem_crate_claims(user_id, week_start_date);
