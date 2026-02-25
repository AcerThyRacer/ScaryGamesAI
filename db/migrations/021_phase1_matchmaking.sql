-- Phase 1.2: Dynamic Skill-Based Matchmaking System
-- ELO-based rating with seasonal rankings and tournaments
-- Migration 021 - Created: February 19, 2026

-- Matchmaking Ratings
CREATE TABLE IF NOT EXISTS matchmaking_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_type VARCHAR(50) NOT NULL,
    mode VARCHAR(50) DEFAULT 'ranked',
    rating INTEGER DEFAULT 1200,
    rating_deviation INTEGER DEFAULT 350,
    games_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    peak_rating INTEGER DEFAULT 1200,
    season INTEGER DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_rating UNIQUE (user_id, game_type, season)
);

-- Matchmaking Queue
CREATE TABLE IF NOT EXISTS matchmaking_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_type VARCHAR(50) NOT NULL,
    mode VARCHAR(50) DEFAULT 'ranked',
    rating INTEGER NOT NULL,
    rating_deviation INTEGER NOT NULL,
    games_played INTEGER DEFAULT 0,
    preferred_role VARCHAR(50),
    status VARCHAR(20) DEFAULT 'searching',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes')
);

-- Match History
CREATE TABLE IF NOT EXISTS match_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES users(id) ON DELETE CASCADE,
    opponent_id UUID REFERENCES users(id),
    game_type VARCHAR(50) NOT NULL,
    won BOOLEAN NOT NULL,
    score INTEGER,
    opponent_score INTEGER,
    rating_before INTEGER NOT NULL,
    rating_after INTEGER NOT NULL,
    rating_change INTEGER NOT NULL,
    match_duration INTEGER,
    additional_stats JSONB DEFAULT '{}'::jsonb,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matchmaking Seasons
CREATE TABLE IF NOT EXISTS matchmaking_seasons (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    rewards JSONB DEFAULT '{}'::jsonb,
    active BOOLEAN DEFAULT FALSE
);

-- Leaderboard Snapshots
CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season INTEGER NOT NULL,
    game_type VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL,
    username VARCHAR(50) NOT NULL,
    rating INTEGER NOT NULL,
    rank INTEGER NOT NULL,
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Smurf Detection
CREATE TABLE IF NOT EXISTS smurf_detection (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    suspicion_level INTEGER DEFAULT 0,
    indicators JSONB DEFAULT '[]'::jsonb,
    reviewed BOOLEAN DEFAULT FALSE,
    action_taken VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament Brackets
CREATE TABLE IF NOT EXISTS tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    game_type VARCHAR(50) NOT NULL,
    format VARCHAR(50) DEFAULT 'single_elimination',
    min_rating INTEGER DEFAULT 0,
    max_rating INTEGER DEFAULT 9999,
    max_participants INTEGER DEFAULT 16,
    entry_fee INTEGER DEFAULT 0,
    prize_pool JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'registration',
    registered_count INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament Participants
CREATE TABLE IF NOT EXISTS tournament_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    seed INTEGER,
    eliminated BOOLEAN DEFAULT FALSE,
    final_rank INTEGER,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament Matches
CREATE TABLE IF NOT EXISTS tournament_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    player1_id UUID REFERENCES users(id),
    player2_id UUID REFERENCES users(id),
    winner_id UUID REFERENCES users(id),
    score_player1 INTEGER DEFAULT 0,
    score_player2 INTEGER DEFAULT 0,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_tournament_match UNIQUE (tournament_id, round, player1_id, player2_id)
);

-- INDEXES
CREATE INDEX idx_matchmaking_ratings_user ON matchmaking_ratings(user_id, game_type);
CREATE INDEX idx_matchmaking_ratings_season ON matchmaking_ratings(season, game_type, rating DESC);
CREATE INDEX idx_matchmaking_queue_status ON matchmaking_queue(status, game_type, created_at);
CREATE INDEX idx_match_history_player ON match_history(player_id, game_type, completed_at DESC);
CREATE INDEX idx_leaderboard_season ON leaderboard_snapshots(season, game_type, rating DESC);
CREATE INDEX idx_tournaments_status ON tournaments(status, created_at);
CREATE INDEX idx_tournament_participants ON tournament_participants(tournament_id, user_id);

-- TRIGGERS
CREATE OR REPLACE FUNCTION update_tournament_participant_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tournaments SET registered_count = registered_count + 1 WHERE id = NEW.tournament_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tournament_participant_insert
    AFTER INSERT ON tournament_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_tournament_participant_count();

-- SEED DATA
INSERT INTO matchmaking_seasons (id, name, start_date, end_date, active) VALUES
(1, 'Season 1: Awakening', NOW() - INTERVAL '30 days', NOW() + INTERVAL '60 days', TRUE),
(2, 'Season 2: Darkness Rising', NOW() + INTERVAL '60 days', NOW() + INTERVAL '150 days', FALSE);

-- Migration complete
