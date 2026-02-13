-- ScaryGamesAI PostgreSQL battle pass v2 schema
-- Phase 5 Step 3 (5.2): quests, bonus tiers, repeatables, team pass, retroactive claims

CREATE TABLE IF NOT EXISTS battle_pass_seasons (
  id TEXT PRIMARY KEY,
  season_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  base_xp_per_tier INTEGER NOT NULL DEFAULT 1000 CHECK (base_xp_per_tier > 0),
  max_base_tier INTEGER NOT NULL DEFAULT 100 CHECK (max_base_tier >= 1),
  max_bonus_tier INTEGER NOT NULL DEFAULT 110 CHECK (max_bonus_tier >= 100),
  repeatable_currency_amount INTEGER NOT NULL DEFAULT 25 CHECK (repeatable_currency_amount >= 0),
  team_daily_contribution_cap INTEGER NOT NULL DEFAULT 1500 CHECK (team_daily_contribution_cap >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS battle_pass_tiers (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
  tier_number INTEGER NOT NULL CHECK (tier_number >= 1),
  reward_type TEXT NOT NULL,
  reward_name TEXT NOT NULL,
  reward_amount INTEGER NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
  reward_tier TEXT NOT NULL DEFAULT 'common',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (season_id, tier_number)
);

CREATE TABLE IF NOT EXISTS battle_pass_quests (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
  quest_code TEXT NOT NULL,
  quest_kind TEXT NOT NULL CHECK (quest_kind IN ('daily', 'weekly', 'milestone')),
  event_type TEXT NOT NULL,
  required_count INTEGER NOT NULL DEFAULT 1 CHECK (required_count > 0),
  xp_reward INTEGER NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_repeatable BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (season_id, quest_code)
);

CREATE TABLE IF NOT EXISTS battle_pass_user_progress (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  xp BIGINT NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_event_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (season_id, user_id)
);

CREATE TABLE IF NOT EXISTS battle_pass_events (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_value INTEGER NOT NULL DEFAULT 1 CHECK (event_value > 0),
  source TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS battle_pass_quest_completions (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL REFERENCES battle_pass_quests(id) ON DELETE CASCADE,
  completion_bucket TEXT NOT NULL,
  progress_count INTEGER NOT NULL DEFAULT 0 CHECK (progress_count >= 0),
  xp_awarded INTEGER NOT NULL DEFAULT 0 CHECK (xp_awarded >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (season_id, user_id, quest_id, completion_bucket)
);

CREATE TABLE IF NOT EXISTS battle_pass_reward_claims (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier_number INTEGER NOT NULL CHECK (tier_number >= 1),
  claim_type TEXT NOT NULL DEFAULT 'tier' CHECK (claim_type IN ('tier', 'retroactive')),
  reward_type TEXT NOT NULL,
  reward_amount INTEGER NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (season_id, user_id, tier_number, claim_type)
);

CREATE TABLE IF NOT EXISTS battle_pass_teams (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_xp BIGINT NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (season_id, name)
);

CREATE TABLE IF NOT EXISTS battle_pass_team_members (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES battle_pass_teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS battle_pass_team_daily_contributions (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES battle_pass_teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_key DATE NOT NULL,
  contributed_xp INTEGER NOT NULL DEFAULT 0 CHECK (contributed_xp >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, user_id, day_key)
);

CREATE TABLE IF NOT EXISTS battle_pass_team_progress_events (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES battle_pass_teams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  xp_amount INTEGER NOT NULL CHECK (xp_amount > 0),
  day_key DATE NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS battle_pass_retroactive_claims (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES battle_pass_seasons(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier_number INTEGER NOT NULL CHECK (tier_number >= 1),
  reward_type TEXT NOT NULL,
  reward_amount INTEGER NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (season_id, user_id, tier_number)
);

CREATE INDEX IF NOT EXISTS idx_bp_seasons_active_window
  ON battle_pass_seasons(is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_bp_tiers_season_tier
  ON battle_pass_tiers(season_id, tier_number);
CREATE INDEX IF NOT EXISTS idx_bp_quests_season_kind
  ON battle_pass_quests(season_id, quest_kind);
CREATE INDEX IF NOT EXISTS idx_bp_user_progress_season_user
  ON battle_pass_user_progress(season_id, user_id);
CREATE INDEX IF NOT EXISTS idx_bp_events_season_user_type
  ON battle_pass_events(season_id, user_id, event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_bp_quest_completions_user
  ON battle_pass_quest_completions(season_id, user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_bp_reward_claims_user
  ON battle_pass_reward_claims(season_id, user_id, claimed_at DESC);
CREATE INDEX IF NOT EXISTS idx_bp_team_members_user
  ON battle_pass_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_bp_team_daily_contrib_lookup
  ON battle_pass_team_daily_contributions(team_id, user_id, day_key);
CREATE INDEX IF NOT EXISTS idx_bp_team_progress_events_team
  ON battle_pass_team_progress_events(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bp_retro_claims_user
  ON battle_pass_retroactive_claims(season_id, user_id, claimed_at DESC);
