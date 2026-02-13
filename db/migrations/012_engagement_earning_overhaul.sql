-- ScaryGamesAI PostgreSQL engagement earning overhaul
-- Daily/weekly/season quests, tournament participation rewards, and community goals.

CREATE TABLE IF NOT EXISTS weekly_quest_completions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  quest_code TEXT NOT NULL,
  reward_gems INTEGER NOT NULL DEFAULT 0 CHECK (reward_gems >= 0),
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start_date, quest_code)
);

CREATE INDEX IF NOT EXISTS idx_weekly_quest_completions_user_week
  ON weekly_quest_completions(user_id, week_start_date, completed_at DESC);

CREATE TABLE IF NOT EXISTS season_quest_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season_key TEXT NOT NULL,
  completed_count INTEGER NOT NULL DEFAULT 0 CHECK (completed_count >= 0),
  reward_claimed BOOLEAN NOT NULL DEFAULT FALSE,
  reward_claimed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, season_key)
);

CREATE INDEX IF NOT EXISTS idx_season_quest_progress_user_season
  ON season_quest_progress(user_id, season_key, updated_at DESC);

CREATE TABLE IF NOT EXISTS season_quest_progress_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  season_key TEXT NOT NULL,
  quest_code TEXT NOT NULL,
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, season_key, quest_code)
);

CREATE INDEX IF NOT EXISTS idx_season_quest_progress_events_user
  ON season_quest_progress_events(user_id, season_key, completed_at DESC);

CREATE TABLE IF NOT EXISTS tournament_participation_rewards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tournament_id TEXT NOT NULL,
  reward_tier TEXT NOT NULL,
  souls_awarded INTEGER NOT NULL DEFAULT 0 CHECK (souls_awarded >= 0),
  gems_awarded INTEGER NOT NULL DEFAULT 0 CHECK (gems_awarded >= 0),
  reward_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, tournament_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_participation_rewards_user
  ON tournament_participation_rewards(user_id, claimed_at DESC);

CREATE TABLE IF NOT EXISTS community_goal_progress (
  id TEXT PRIMARY KEY,
  goal_code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  reward_description TEXT,
  target_value BIGINT NOT NULL CHECK (target_value >= 1),
  current_value BIGINT NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  reward_gems INTEGER NOT NULL DEFAULT 0 CHECK (reward_gems >= 0),
  reward_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1 CHECK (reward_multiplier >= 1),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_goal_progress_code
  ON community_goal_progress(goal_code);

CREATE TABLE IF NOT EXISTS community_goal_reward_claims (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_code TEXT NOT NULL REFERENCES community_goal_progress(goal_code) ON DELETE CASCADE,
  reward_gems INTEGER NOT NULL DEFAULT 0 CHECK (reward_gems >= 0),
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, goal_code)
);

CREATE INDEX IF NOT EXISTS idx_community_goal_reward_claims_user
  ON community_goal_reward_claims(user_id, claimed_at DESC);

INSERT INTO community_goal_progress (
  id,
  goal_code,
  label,
  reward_description,
  target_value,
  current_value,
  reward_gems,
  reward_multiplier,
  metadata,
  created_at,
  updated_at
)
VALUES
  (
    'cgoal_games_played_1000000',
    'games_played_1000000',
    '1,000,000 games played',
    'Everyone gets 100 gems',
    1000000,
    0,
    100,
    1,
    '{}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    'cgoal_new_players_10000',
    'new_players_10000',
    '10,000 new players',
    'Everyone gets 50 gems',
    10000,
    0,
    50,
    1,
    '{}'::jsonb,
    NOW(),
    NOW()
  ),
  (
    'cgoal_holiday_events',
    'holiday_events',
    'Holiday events',
    'Double rewards weekends',
    1,
    0,
    0,
    2,
    '{}'::jsonb,
    NOW(),
    NOW()
  )
ON CONFLICT (goal_code) DO NOTHING;
