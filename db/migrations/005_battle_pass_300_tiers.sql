-- Raise battle pass seasonal caps/defaults to support long 300-tier seasons

ALTER TABLE battle_pass_seasons
  ALTER COLUMN max_base_tier SET DEFAULT 300,
  ALTER COLUMN max_bonus_tier SET DEFAULT 300;

ALTER TABLE battle_pass_seasons
  DROP CONSTRAINT IF EXISTS battle_pass_seasons_max_bonus_tier_check;

ALTER TABLE battle_pass_seasons
  ADD CONSTRAINT battle_pass_seasons_max_bonus_tier_check
  CHECK (max_bonus_tier >= max_base_tier);

UPDATE battle_pass_seasons
SET
  max_base_tier = GREATEST(max_base_tier, 300),
  max_bonus_tier = GREATEST(max_bonus_tier, 300),
  updated_at = NOW()
WHERE is_active = TRUE
  AND (max_base_tier < 300 OR max_bonus_tier < 300);
