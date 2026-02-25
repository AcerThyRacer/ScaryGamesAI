-- Phase 2 AI Expansion Migration
-- Created: 2026-02-17
-- Description: Database schema for AI-powered dynamic experiences

-- A/B Testing
CREATE TABLE IF NOT EXISTS ab_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft', -- draft, running, completed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    traffic_split DECIMAL(5,2) DEFAULT 50.00,
    primary_metric VARCHAR(100),
    winner_variant VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS ab_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID REFERENCES ab_experiments(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    config JSONB NOT NULL,
    weight INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS ab_assignments (
    user_id UUID NOT NULL,
    experiment_id UUID REFERENCES ab_experiments(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES ab_variants(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, experiment_id)
);

CREATE TABLE IF NOT EXISTS ab_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES ab_assignments(id) ON DELETE CASCADE,
    event_name VARCHAR(100) NOT NULL,
    event_value DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cheat Detection
CREATE TABLE IF NOT EXISTS cheat_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    game_id VARCHAR(100) NOT NULL,
    report_type VARCHAR(50) NOT NULL, -- behavioral_anomaly, score_validation, pattern_match
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    evidence JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, reviewed, actioned, dismissed
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enforcement_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- warning, temporary_ban, permanent_ban
    reason TEXT,
    duration_hours INTEGER, -- For temporary bans
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID -- System or moderator
);

-- Recommendation Cache
CREATE TABLE IF NOT EXISTS recommendation_cache (
    user_id UUID PRIMARY KEY,
    recommendations JSONB NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    context JSONB
);

-- Player Skill Assessment
CREATE TABLE IF NOT EXISTS player_skill_assessments (
    user_id UUID NOT NULL,
    game_id VARCHAR(100) NOT NULL,
    assessment_date DATE DEFAULT CURRENT_DATE,
    skill_score DECIMAL(5,2), -- 0-100
    skill_tier VARCHAR(20), -- novice, intermediate, advanced, expert, master
    features JSONB, -- Raw features used for assessment
    PRIMARY KEY (user_id, game_id, assessment_date)
);

-- Loot Distribution Tracking
CREATE TABLE IF NOT EXISTS loot_drops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    game_id VARCHAR(100) NOT NULL,
    item_id VARCHAR(100) NOT NULL,
    rarity VARCHAR(20) NOT NULL, -- common, uncommon, rare, legendary
    context JSONB, -- Location, enemy, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Procedural Generation Cache
CREATE TABLE IF NOT EXISTS procedural_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seed VARCHAR(100) NOT NULL,
    generation_type VARCHAR(50) NOT NULL, -- wfc, dungeon, maze, narrative
    content JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(seed, generation_type)
);

-- AI Metrics Tracking
CREATE TABLE IF NOT EXISTS ai_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_id VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- skill_assessment, stress_level, fear_response
    metric_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cheat_reports_user ON cheat_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_cheat_reports_status ON cheat_reports(status);
CREATE INDEX IF NOT EXISTS idx_cheat_reports_created ON cheat_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_enforcement_actions_user ON enforcement_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_enforcement_actions_created ON enforcement_actions(created_at);
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_expires ON recommendation_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_player_skill_assessments_date ON player_skill_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_player_skill_assessments_user ON player_skill_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_loot_drops_user ON loot_drops(user_id);
CREATE INDEX IF NOT EXISTS idx_loot_drops_game ON loot_drops(game_id);
CREATE INDEX IF NOT EXISTS idx_procedural_cache_seed ON procedural_cache(seed);
CREATE INDEX IF NOT EXISTS idx_procedural_cache_type ON procedural_cache(generation_type);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_user ON ai_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_session ON ai_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_type ON ai_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_ab_experiments_status ON ab_experiments(status);
CREATE INDEX IF NOT EXISTS idx_ab_assignments_user ON ab_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_events_assignment ON ab_events(assignment_id);

-- Update existing tables
DO $$ BEGIN
    ALTER TABLE users ADD COLUMN ab_test_assignments JSONB DEFAULT '{}';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE users ADD COLUMN cheat_flags INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE users ADD COLUMN skill_assessment_version INTEGER DEFAULT 1;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE users ADD COLUMN horror_profile JSONB;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE users ADD COLUMN play_patterns JSONB;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Insert default A/B experiments
INSERT INTO ab_experiments (id, name, description, status, primary_metric) VALUES
    ('00000000-0000-0000-0000-000000000001', 'ai_director_difficulty', 'Test different AI director difficulty curves', 'draft', 'retention_d7'),
    ('00000000-0000-0000-0000-000000000002', 'scare_timing_algorithm', 'Test optimized vs random scare timing', 'draft', 'engagement_time'),
    ('00000000-0000-0000-0000-000000000003', 'recommendation_algorithm', 'Test collaborative vs content-based filtering', 'draft', 'click_through_rate')
ON CONFLICT (id) DO NOTHING;

-- Insert default variants for experiments
INSERT INTO ab_variants (experiment_id, name, config, weight) VALUES
    ('00000000-0000-0000-0000-000000000001', 'control', '{"difficulty_curve": "linear"}', 1),
    ('00000000-0000-0000-0000-000000000001', 'adaptive', '{"difficulty_curve": "ml_adaptive"}', 1),
    ('00000000-0000-0000-0000-000000000002', 'control', '{"timing": "random"}', 1),
    ('00000000-0000-0000-0000-000000000002', 'optimized', '{"timing": "fear_profile_based"}', 1),
    ('00000000-0000-0000-0000-000000000003', 'collaborative', '{"algorithm": "collaborative_filtering"}', 1),
    ('00000000-0000-0000-0000-000000000003', 'content', '{"algorithm": "content_based"}', 1),
    ('00000000-0000-0000-0000-000000000003', 'hybrid', '{"algorithm": "hybrid"}', 1)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE ab_experiments IS 'A/B testing experiments for AI features';
COMMENT ON TABLE ab_variants IS 'Variants for A/B testing experiments';
COMMENT ON TABLE ab_assignments IS 'User assignments to A/B test variants';
COMMENT ON TABLE ab_events IS 'Conversion events for A/B testing';
COMMENT ON TABLE cheat_reports IS 'Cheat detection reports';
COMMENT ON TABLE enforcement_actions IS 'Enforcement actions taken against users';
COMMENT ON TABLE recommendation_cache IS 'Cached personalized recommendations';
COMMENT ON TABLE player_skill_assessments IS 'ML-based player skill assessments';
COMMENT ON TABLE loot_drops IS 'Procedural loot drop tracking';
COMMENT ON TABLE procedural_cache IS 'Cached procedurally generated content';
COMMENT ON TABLE ai_metrics IS 'AI system metrics and analytics';
