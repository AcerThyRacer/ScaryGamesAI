-- ScaryGamesAI PostgreSQL schema for achievement tier rewards
-- Phase: Achievement economy rewards

ALTER TABLE achievements
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'bronze';

ALTER TABLE achievements
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_user_achievement_unique
  ON achievements(user_id, achievement_id);
