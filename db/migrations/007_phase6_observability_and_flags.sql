-- Phase 6 observability + feature-flag operational auditing

CREATE TABLE IF NOT EXISTS feature_flag_audit_logs (
  id TEXT PRIMARY KEY,
  flag_key TEXT NOT NULL,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  previous_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  next_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_logs_flag_time
  ON feature_flag_audit_logs(flag_key, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_flag_audit_logs_actor_time
  ON feature_flag_audit_logs(actor_user_id, occurred_at DESC);
