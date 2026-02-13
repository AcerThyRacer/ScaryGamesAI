-- ScaryGamesAI PostgreSQL engagement features schema
-- Phase 6.1: daily spin wheel, treasure maps, and skin crafting

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS blood_gems INTEGER NOT NULL DEFAULT 0 CHECK (blood_gems >= 0);

CREATE TABLE IF NOT EXISTS daily_spin_claims (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  spin_type TEXT NOT NULL CHECK (spin_type IN ('free', 'premium')),
  spin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reward_type TEXT NOT NULL,
  reward_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  spent_gems INTEGER NOT NULL DEFAULT 0 CHECK (spent_gems >= 0),
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_spin_free_per_day
  ON daily_spin_claims(user_id, spin_date, spin_type)
  WHERE spin_type = 'free';

CREATE INDEX IF NOT EXISTS idx_daily_spin_claims_user_date
  ON daily_spin_claims(user_id, spin_date, created_at DESC);

CREATE TABLE IF NOT EXISTS treasure_map_piece_claims (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  piece_number INTEGER NOT NULL CHECK (piece_number >= 1 AND piece_number <= 6),
  source_game TEXT,
  piece_item_key TEXT NOT NULL,
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treasure_map_piece_claims_user_time
  ON treasure_map_piece_claims(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_treasure_map_piece_claims_user_piece
  ON treasure_map_piece_claims(user_id, piece_number);

CREATE TABLE IF NOT EXISTS treasure_map_treasure_claims (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_item_key TEXT NOT NULL,
  consumed_piece_count INTEGER NOT NULL DEFAULT 6 CHECK (consumed_piece_count >= 1),
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treasure_map_treasure_claims_user_time
  ON treasure_map_treasure_claims(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS skin_crafting_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  input_item_keys JSONB NOT NULL DEFAULT '[]'::jsonb,
  output_item_key TEXT NOT NULL,
  output_rarity TEXT NOT NULL,
  gem_cost INTEGER NOT NULL DEFAULT 0 CHECK (gem_cost >= 0),
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skin_crafting_events_user_time
  ON skin_crafting_events(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS gem_dust_conversion_claims (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversion_month DATE NOT NULL,
  gems_converted INTEGER NOT NULL CHECK (gems_converted >= 1),
  dust_spent INTEGER NOT NULL CHECK (dust_spent >= 100),
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (dust_spent = gems_converted * 100)
);

CREATE INDEX IF NOT EXISTS idx_gem_dust_conversion_claims_user_month
  ON gem_dust_conversion_claims(user_id, conversion_month, created_at DESC);
