-- ScaryGamesAI PostgreSQL Phase 6 core schema
-- Adds game states, leaderboards, analytics events, OAuth identities, sessions,
-- feature flags, and authentication audit logging.

CREATE TABLE IF NOT EXISTS game_states (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_key TEXT NOT NULL,
  save_slot INTEGER NOT NULL DEFAULT 1,
  state_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  last_checkpoint TEXT,
  last_played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, game_key, save_slot)
);

CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_key TEXT NOT NULL,
  season_key TEXT NOT NULL DEFAULT 'global',
  score BIGINT NOT NULL,
  rank_value INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_category TEXT NOT NULL,
  event_source TEXT,
  session_id TEXT,
  page TEXT,
  game_key TEXT,
  event_value NUMERIC(12,2),
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oauth_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_email TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  scopes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_user_id)
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  jti TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  device_name TEXT,
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  rotated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  UNIQUE (jti)
);

CREATE TABLE IF NOT EXISTS user_2fa (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  totp_secret_encrypted TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  backup_codes_hashes JSONB NOT NULL DEFAULT '[]'::jsonb,
  recovery_used_count INTEGER NOT NULL DEFAULT 0,
  enrolled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  rollout_percentage INTEGER NOT NULL DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT,
  provider TEXT,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  request_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_states_user_game ON game_states(user_id, game_key, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_game_season_score ON leaderboard_entries(game_key, season_key, score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_user ON leaderboard_entries(user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_time ON analytics_events(event_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_time ON analytics_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_oauth_identities_user_provider ON oauth_identities(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions(user_id, is_revoked, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_user_time ON auth_audit_logs(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_action_status ON auth_audit_logs(action, status, occurred_at DESC);
