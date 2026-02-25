/**
 * Phase 1.2: Dynamic Skill-Based Matchmaking API
 * ELO-based rating system with adaptive opponent matching
 */

const express = require('express');
const { query } = require('../db/postgres');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware: Authenticate all routes
router.use(authenticateToken);

// ELO Configuration
const ELO_CONFIG = {
    INITIAL_RATING: 1200,
    K_FACTOR: 32, // Base K-factor for rating changes
    K_FACTOR_NEW_PLAYER: 40, // Higher K-factor for new players (first 20 games)
    K_FACTOR_HIGH_RATED: 24, // Lower K-factor for high-rated players (2000+)
    BONUS_WIN_STREAK: 5, // Bonus ELO for win streaks (3+ wins)
    PENALTY_LOSE_STREAK: -3, // Penalty mitigation for lose streaks (3+ losses)
    DEVIATION_INITIAL: 350, // Initial rating deviation
    DEVIATION_MINIMUM: 50, // Minimum rating deviation
    DEVIATION_DECAY: 0.0005, // Rating deviation decay rate
};

/**
 * GET /api/matchmaking/profile
 * Get player's matchmaking profile with ELO ratings
 */
router.get('/profile', async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get player's ELO ratings for all game modes
        const eloResult = await query(`
            SELECT * FROM matchmaking_ratings 
            WHERE user_id = $1
            ORDER BY game_type, rating DESC
        `, [userId]);
        
        // Get recent matches
        const recentMatchesResult = await query(`
            SELECT * FROM match_history 
            WHERE player_id = $1
            ORDER BY completed_at DESC
            LIMIT 10
        `, [userId]);
        
        // Get win/loss streak
        const streakInfo = calculateStreak(recentMatchesResult.rows);
        
        res.json({
            success: true,
            data: {
                ratings: eloResult.rows,
                recentMatches: recentMatchesResult.rows,
                currentStreak: streakInfo
            }
        });
    } catch (error) {
        console.error('Error getting matchmaking profile:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to load matchmaking profile' 
        });
    }
});

/**
 * POST /api/matchmaking/find
 * Find a match for the player
 */
router.post('/find', async (req, res) => {
    try {
        const userId = req.user.id;
        const { gameType, mode = 'ranked', maxWaitTime = 30000 } = req.body;
        
        if (!gameType) {
            return res.status(400).json({ 
                success: false, 
                error: 'Game type required' 
            });
        }
        
        // Get player's rating
        let ratingResult = await query(`
            SELECT * FROM matchmaking_ratings 
            WHERE user_id = $1 AND game_type = $2
        `, [userId, gameType]);
        
        let playerRating;
        if (ratingResult.rows.length === 0) {
            // Create initial rating
            ratingResult = await query(`
                INSERT INTO matchmaking_ratings 
                (user_id, game_type, rating, rating_deviation, games_played)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `, [userId, gameType, ELO_CONFIG.INITIAL_RATING, ELO_CONFIG.DEVIATION_INITIAL, 0]);
            playerRating = ratingResult.rows[0];
        } else {
            playerRating = ratingResult.rows[0];
        }
        
        // Add player to queue
        const queueResult = await query(`
            INSERT INTO matchmaking_queue 
            (user_id, game_type, mode, rating, rating_deviation, games_played)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [
            userId, 
            gameType, 
            mode, 
            playerRating.rating, 
            playerRating.rating_deviation,
            playerRating.games_played
        ]);
        
        // Try to find match (in production, this would be done by a background worker)
        const matchFound = await findMatch(userId, gameType, mode, playerRating);
        
        if (matchFound) {
            res.json({
                success: true,
                data: {
                    matchFound: true,
                    match: matchFound,
                    queueTime: Date.now()
                }
            });
        } else {
            res.json({
                success: true,
                data: {
                    matchFound: false,
                    queueId: queueResult.rows[0].id,
                    estimatedWaitTime: '30-60 seconds',
                    searching: true
                }
            });
        }
    } catch (error) {
        console.error('Error finding match:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to find match' 
        });
    }
});

/**
 * POST /api/matchmaking/cancel
 * Cancel queued matchmaking
 */
router.post('/cancel', async (req, res) => {
    try {
        const userId = req.user.id;
        const { gameType } = req.body;
        
        await query(`
            DELETE FROM matchmaking_queue 
            WHERE user_id = $1 AND game_type = $2
        `, [userId, gameType]);
        
        res.json({
            success: true,
            message: 'Matchmaking cancelled'
        });
    } catch (error) {
        console.error('Error cancelling matchmaking:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to cancel matchmaking' 
        });
    }
});

/**
 * POST /api/matchmaking/result
 * Report match result and update ELO
 */
router.post('/result', async (req, res) => {
    try {
        const userId = req.user.id;
        const { 
            gameType, 
            opponentId, 
            won, 
            score, 
            opponentScore,
            matchDuration,
            additionalStats = {}
        } = req.body;
        
        if (!gameType || opponentId === undefined || won === undefined) {
            return res.status(400).json({ 
                success: false, 
                error: 'Game type, opponent ID, and result required' 
            });
        }
        
        // Get both players' ratings
        const playerRatingResult = await query(`
            SELECT * FROM matchmaking_ratings 
            WHERE user_id = $1 AND game_type = $2
        `, [userId, gameType]);
        
        const opponentRatingResult = await query(`
            SELECT * FROM matchmaking_ratings 
            WHERE user_id = $3 AND game_type = $4
        `, [opponentId, gameType]);
        
        if (playerRatingResult.rows.length === 0 || opponentRatingResult.rows.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Rating not found for one or both players' 
            });
        }
        
        const playerRating = playerRatingResult.rows[0];
        const opponentRating = opponentRatingResult.rows[0];
        
        // Calculate ELO changes
        const playerExpected = calculateExpectedScore(playerRating.rating, opponentRating.rating);
        const opponentExpected = calculateExpectedScore(opponentRating.rating, playerRating.rating);
        
        // Determine K-factors
        const playerK = calculateKFactor(playerRating);
        const opponentK = calculateKFactor(opponentRating);
        
        // Calculate rating changes
        const actualResult = won ? 1 : 0;
        const playerRatingChange = Math.round(playerK * (actualResult - playerExpected));
        const opponentRatingChange = Math.round(opponentK * ((1 - actualResult) - opponentExpected));
        
        // Get streak info
        const recentMatchesResult = await query(`
            SELECT won FROM match_history 
            WHERE player_id = $1 AND game_type = $2
            ORDER BY completed_at DESC
            LIMIT 5
        `, [userId, gameType]);
        
        const streakInfo = calculateStreak(recentMatchesResult.rows);
        
        // Apply streak bonuses/penalties
        let finalRatingChange = playerRatingChange;
        if (won && streakInfo.streak >= 3) {
            finalRatingChange += ELO_CONFIG.BONUS_WIN_STREAK;
        } else if (!won && streakInfo.streak >= 3 && streakInfo.type === 'loss') {
            finalRatingChange = Math.max(finalRatingChange, ELO_CONFIG.PENALTY_LOSE_STREAK);
        }
        
        // Update player rating
        const newPlayerDeviation = Math.max(
            ELO_CONFIG.DEVIATION_MINIMUM,
            playerRating.rating_deviation * (1 - ELO_CONFIG.DEVIATION_DECAY)
        );
        
        await query(`
            UPDATE matchmaking_ratings 
            SET rating = rating + $1,
                rating_deviation = $2,
                games_played = games_played + 1,
                wins = wins + $3,
                losses = losses + $4,
                updated_at = NOW()
            WHERE user_id = $5 AND game_type = $6
        `, [
            finalRatingChange,
            newPlayerDeviation,
            won ? 1 : 0,
            won ? 0 : 1,
            userId,
            gameType
        ]);
        
        // Update opponent rating
        const newOpponentDeviation = Math.max(
            ELO_CONFIG.DEVIATION_MINIMUM,
            opponentRating.rating_deviation * (1 - ELO_CONFIG.DEVIATION_DECAY)
        );
        
        await query(`
            UPDATE matchmaking_ratings 
            SET rating = rating + $1,
                rating_deviation = $2,
                games_played = games_played + 1,
                wins = wins + $3,
                losses = losses + $4,
                updated_at = NOW()
            WHERE user_id = $5 AND game_type = $6
        `, [
            opponentRatingChange,
            newOpponentDeviation,
            won ? 0 : 1,
            won ? 1 : 0,
            opponentId,
            gameType
        ]);
        
        // Record match history
        await query(`
            INSERT INTO match_history 
            (player_id, opponent_id, game_type, won, score, opponent_score, 
             rating_before, rating_after, rating_change, match_duration, additional_stats)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
            userId,
            opponentId,
            gameType,
            won,
            score,
            opponentScore,
            playerRating.rating,
            playerRating.rating + finalRatingChange,
            finalRatingChange,
            matchDuration,
            JSON.stringify(additionalStats)
        ]);
        
        // Update player profile stats
        await query(`
            UPDATE player_profiles 
            SET total_wins = total_wins + $1,
                total_losses = total_losses + $2
            WHERE user_id = $3
        `, [won ? 1 : 0, won ? 0 : 1, userId]);
        
        res.json({
            success: true,
            data: {
                ratingChange: finalRatingChange,
                newRating: playerRating.rating + finalRatingChange,
                opponentRatingChange: opponentRatingChange,
                opponentNewRating: opponentRating.rating + opponentRatingChange,
                streak: streakInfo
            }
        });
    } catch (error) {
        console.error('Error recording match result:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to record match result' 
        });
    }
});

/**
 * GET /api/matchmaking/leaderboard
 * Get leaderboard for a game type
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const { gameType, limit = 100, offset = 0 } = req.query;
        
        if (!gameType) {
            return res.status(400).json({ 
                success: false, 
                error: 'Game type required' 
            });
        }
        
        const leaderboardResult = await query(`
            SELECT 
                mr.rating,
                mr.games_played,
                mr.wins,
                mr.losses,
                ROUND((mr.wins::DECIMAL / NULLIF(mr.games_played, 0)) * 100, 2) as win_rate,
                pp.username,
                pp.avatar_url,
                pp.master_level,
                pp.prestige_rank
            FROM matchmaking_ratings mr
            JOIN player_profiles pp ON mr.user_id = pp.user_id
            WHERE mr.game_type = $1
            ORDER BY mr.rating DESC
            LIMIT $2 OFFSET $3
        `, [gameType, parseInt(limit), parseInt(offset)]);
        
        res.json({
            success: true,
            data: {
                leaderboard: leaderboardResult.rows,
                total: leaderboardResult.rows.length
            }
        });
    } catch (error) {
        console.error('Error getting leaderboard:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to load leaderboard' 
        });
    }
});

/**
 * GET /api/matchmaking/stats
 * Get detailed matchmaking statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user.id;
        const { gameType } = req.query;
        
        let statsQuery = `
            SELECT 
                COUNT(*) as total_matches,
                COUNT(*) FILTER (WHERE won = true) as wins,
                COUNT(*) FILTER (WHERE won = false) as losses,
                ROUND((COUNT(*) FILTER (WHERE won = true)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as win_rate,
                AVG(rating_change) as avg_rating_change,
                MAX(rating) as peak_rating,
                MIN(rating_before) as lowest_rating
            FROM match_history
            WHERE player_id = $1
        `;
        
        const params = [userId];
        
        if (gameType) {
            statsQuery += ' AND game_type = $2';
            params.push(gameType);
        }
        
        const statsResult = await query(statsQuery, params);
        
        // Get performance by time of day
        let timeStatsQuery = `
            SELECT 
                EXTRACT(HOUR FROM completed_at) as hour,
                COUNT(*) as matches,
                ROUND((COUNT(*) FILTER (WHERE won = true)::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 2) as win_rate
            FROM match_history
            WHERE player_id = $1
        `;
        
        const timeParams = [userId];
        
        if (gameType) {
            timeStatsQuery += ' AND game_type = $2';
            timeParams.push(gameType);
        }
        
        timeStatsQuery += ' GROUP BY EXTRACT(HOUR FROM completed_at) ORDER BY hour';
        
        const timeStatsResult = await query(timeStatsQuery, timeParams);
        
        res.json({
            success: true,
            data: {
                overall: statsResult.rows[0],
                performanceByHour: timeStatsResult.rows
            }
        });
    } catch (error) {
        console.error('Error getting matchmaking stats:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to load statistics' 
        });
    }
});

// Helper Functions

/**
 * Calculate expected score based on ELO ratings
 */
function calculateExpectedScore(playerRating, opponentRating) {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/**
 * Calculate K-factor based on player experience and rating
 */
function calculateKFactor(rating) {
    if (rating.games_played < 20) {
        return ELO_CONFIG.K_FACTOR_NEW_PLAYER;
    } else if (rating.rating >= 2000) {
        return ELO_CONFIG.K_FACTOR_HIGH_RATED;
    }
    return ELO_CONFIG.K_FACTOR;
}

/**
 * Calculate win/loss streak
 */
function calculateStreak(recentMatches) {
    if (recentMatches.length === 0) {
        return { streak: 0, type: 'none' };
    }
    
    let streak = 0;
    const lastResult = recentMatches[0].won;
    
    for (const match of recentMatches) {
        if (match.won === lastResult) {
            streak++;
        } else {
            break;
        }
    }
    
    return {
        streak: streak,
        type: streak === 0 ? 'none' : (lastResult ? 'win' : 'loss')
    };
}

/**
 * Find matching players in queue
 * This is a simplified version - production would use Redis and background workers
 */
async function findMatch(userId, gameType, mode, playerRating) {
    // Search for players with similar rating (±200 ELO)
    const minRating = Math.max(0, playerRating.rating - 200);
    const maxRating = playerRating.rating + 200;
    
    const matchResult = await query(`
        SELECT mq.*, pp.username
        FROM matchmaking_queue mq
        JOIN player_profiles pp ON mq.user_id = pp.user_id
        WHERE mq.game_type = $1 
        AND mq.mode = $2
        AND mq.user_id != $3
        AND mq.rating BETWEEN $4 AND $5
        AND mq.created_at > NOW() - INTERVAL '5 minutes'
        ORDER BY ABS(mq.rating - $6) ASC
        LIMIT 1
    `, [gameType, mode, userId, minRating, maxRating, playerRating.rating]);
    
    if (matchResult.rows.length > 0) {
        const opponent = matchResult.rows[0];
        
        // Remove both players from queue
        await query(`
            DELETE FROM matchmaking_queue 
            WHERE user_id IN ($1, $2) AND game_type = $3
        `, [userId, opponent.user_id, gameType]);
        
        return {
            player1: { userId, rating: playerRating.rating },
            player2: { userId: opponent.user_id, rating: opponent.rating },
            gameType,
            mode,
            foundAt: new Date()
        };
    }
    
    return null;
}

module.exports = router;
