-- ScaryGamesAI PostgreSQL revenue streams schema
-- Phase 5 Step 4 (5.3): tournament tickets, XP boosters, character packs, season pass, founder's edition

CREATE TABLE IF NOT EXISTS tournament_ticket_consumptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entitlement_id TEXT NOT NULL REFERENCES entitlements(id) ON DELETE CASCADE,
  tournament_id TEXT NOT NULL,
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, tournament_id)
);

CREATE TABLE IF NOT EXISTS user_xp_booster_activations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entitlement_id TEXT NOT NULL REFERENCES entitlements(id) ON DELETE CASCADE,
  multiplier NUMERIC(6,3) NOT NULL CHECK (multiplier >= 1.0 AND multiplier <= 5.0),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  idempotency_key TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS character_unlocks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_key TEXT NOT NULL,
  source_entitlement_id TEXT REFERENCES entitlements(id) ON DELETE SET NULL,
  source_pack_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, character_key)
);

CREATE TABLE IF NOT EXISTS season_pass_coverage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  coverage_year INTEGER NOT NULL CHECK (coverage_year >= 2020 AND coverage_year <= 2200),
  entitlement_id TEXT NOT NULL REFERENCES entitlements(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, coverage_year)
);

CREATE TABLE IF NOT EXISTS founder_edition_ownership (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entitlement_id TEXT NOT NULL REFERENCES entitlements(id) ON DELETE CASCADE,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  transferable BOOLEAN NOT NULL DEFAULT FALSE,
  transfer_eligibility_status TEXT NOT NULL DEFAULT 'not_eligible',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS founder_edition_transfer_events (
  id TEXT PRIMARY KEY,
  founder_ownership_id TEXT NOT NULL REFERENCES founder_edition_ownership(id) ON DELETE CASCADE,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  transfer_status TEXT NOT NULL,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tournament_ticket_consumptions_user_time
  ON tournament_ticket_consumptions(user_id, consumed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_booster_activations_user_window
  ON user_xp_booster_activations(user_id, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_character_unlocks_user
  ON character_unlocks(user_id, unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_season_pass_coverage_user_year
  ON season_pass_coverage(user_id, coverage_year);
CREATE INDEX IF NOT EXISTS idx_founder_ownership_user
  ON founder_edition_ownership(user_id);
CREATE INDEX IF NOT EXISTS idx_founder_transfer_events_ownership
  ON founder_edition_transfer_events(founder_ownership_id, requested_at DESC);
