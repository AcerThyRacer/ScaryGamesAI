/**
 * Universal Progression API - Phase 4
 * Account-wide achievements, cross-game stats, mastery tracking
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireMonetizationAuth } = require('../middleware/auth');
const postgres = require('../models/postgres');
const { executeIdempotentMutation } = require('../services/economyMutationService');

function generateId(prefix = 'up') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * @route GET /api/v1/progression/achievements
 * @desc Get all account-wide achievements
 */
router.get('/achievements', authMiddleware, async (req, res) => {
    try {
        const { category, difficulty } = req.query;
        
        let sql = `SELECT * FROM account_achievements WHERE 1=1`;
        const params = [];
        let paramIndex = 1;
        
        if (category) {
            sql += ` AND category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }
        
        if (difficulty) {
            sql += ` AND difficulty = $${paramIndex}`;
            params.push(difficulty);
            paramIndex++;
        }
        
        sql += ` ORDER BY display_order, difficulty, created_at`;
        
        const result = await postgres.query(sql, params);
        
        res.json({
            success: true,
            achievements: result.rows
        });
    } catch (error) {
        console.error('Get achievements error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch achievements'
        });
    }
});

/**
 * @route GET /api/v1/progression/my-achievements
 * @desc Get user's achievement progress
 */
router.get('/my-achievements', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const sql = `
            SELECT 
                aa.*,
                uaa.progress,
                uaa.is_completed,
                uaa.completed_at,
                uaa.reward_claimed,
                uaa.claimed_at
            FROM account_achievements aa
            LEFT JOIN user_account_achievements uaa ON aa.id = uaa.achievement_id AND uaa.user_id = $1
            ORDER BY 
                CASE WHEN uaa.is_completed THEN 1 ELSE 0 END,
                aa.display_order,
                aa.difficulty
        `;
        
        const result = await postgres.query(sql, [userId]);
        
        res.json({
            success: true,
            achievements: result.rows
        });
    } catch (error) {
        console.error('Get my achievements error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch achievement progress'
        });
    }
});

/**
 * @route POST /api/v1/progression/update-stats/:gameId
 * @desc Update game stats and check achievement progress
 */
router.post('/update-stats/:gameId', authMiddleware, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({ success: false, error: 'idempotency-key required' });
    }
    
    try {
        const userId = req.user.id;
        const { gameId } = req.params;
        const { stats } = req.body; // { kills: 5, deaths: 2, distance: 1000, playtime: 1800 }
        
        const mutation = await executeIdempotentMutation({
            scope: 'progression.update_stats',
            idempotencyKey,
            requestPayload: { userId, gameId, stats },
            actorUserId: userId,
            entityType: 'platform_stats',
            eventType: 'update',
            mutationFn: async () => {
                await postgres.query('BEGIN');
                
                try {
                    // Update game-specific aggregates
                    for (const [statType, value] of Object.entries(stats)) {
                        await postgres.query(
                            `INSERT INTO game_stats_aggregates (user_id, game_id, stat_type, stat_value, sessions_count, last_played_at)
                             VALUES ($1, $2, $3, $4, 1, NOW())
                             ON CONFLICT (user_id, game_id, stat_type)
                             DO UPDATE SET 
                                stat_value = game_stats_aggregates.stat_value + $4,
                                sessions_count = game_stats_aggregates.sessions_count + 1,
                                last_played_at = NOW()`,
                            [userId, gameId, statType, value]
                        );
                    }
                    
                    // Update platform mastery stats
                    for (const [statType, value] of Object.entries(stats)) {
                        const statKey = `total_${statType}`;
                        await postgres.query(
                            `INSERT INTO platform_mastery_stats (user_id, stat_key, stat_value, games_contributed, last_updated)
                             VALUES ($1, $2, $3, $4, NOW())
                             ON CONFLICT (user_id, stat_key)
                             DO UPDATE SET 
                                stat_value = platform_mastery_stats.stat_value + $3,
                                games_contributed = 
                                    CASE 
                                        WHEN platform_mastery_stats.games_contributed ? $5 
                                        THEN platform_mastery_stats.games_contributed
                                        ELSE platform_mastery_stats.games_contributed || $5::jsonb
                                    END,
                                last_updated = NOW()`,
                            [userId, statKey, value, JSON.stringify([gameId]), gameId]
                        );
                    }
                    
                    // Check and update achievements
                    const updatedStats = await postgres.query(
                        `SELECT stat_key, stat_value FROM platform_mastery_stats WHERE user_id = $1`,
                        [userId]
                    );
                    
                    const achievements = await postgres.query(
                        `SELECT * FROM account_achievements WHERE is_hidden = FALSE`
                    );
                    
                    const newlyCompleted = [];
                    
                    for (const achievement of achievements.rows) {
                        const req = achievement.requirement;
                        const statKey = `total_${req.type}`;
                        const matchingStat = updatedStats.rows.find(s => s.stat_key === statKey);
                        
                        if (matchingStat && parseFloat(matchingStat.stat_value) >= req.target) {
                            // Check if already completed
                            const existing = await postgres.query(
                                `SELECT is_completed FROM user_account_achievements WHERE user_id = $1 AND achievement_id = $2`,
                                [userId, achievement.id]
                            );
                            
                            if (!existing.rows[0] || !existing.rows[0].is_completed) {
                                // Mark as completed
                                await postgres.query(
                                    `INSERT INTO user_account_achievements (user_id, achievement_id, progress, is_completed, completed_at)
                                     VALUES ($1, $2, $3, TRUE, NOW())
                                     ON CONFLICT (user_id, achievement_id)
                                     DO UPDATE SET is_completed = TRUE, completed_at = NOW()`,
                                    [userId, achievement.id, JSON.stringify({ [gameId]: matchingStat.stat_value })]
                                );
                                
                                newlyCompleted.push({
                                    achievement_id: achievement.id,
                                    achievement_key: achievement.achievement_key,
                                    name: achievement.name
                                });
                            }
                        }
                    }
                    
                    await postgres.query('COMMIT');
                    
                    return {
                        success: true,
                        updated: true,
                        stats: updatedStats.rows,
                        newlyCompletedAchievements: newlyCompleted
                    };
                } catch (error) {
                    await postgres.query('ROLLBACK');
                    throw error;
                }
            }
        });
        
        res.status(200).json(mutation);
    } catch (error) {
        console.error('Update stats error:', error);
        res.status(500).json({
            success: false,
            error: error.code || 'UPDATE_STATS_FAILED',
            message: error.message || 'Failed to update stats'
        });
    }
});

/**
 * @route GET /api/v1/progression/collection-progress
 * @desc Get user's collection progress across all categories
 */
router.get('/collection-progress', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const sql = `
            SELECT 
                collection_type,
                item_category,
                items_owned,
                total_collected,
                collection_percentage,
                last_updated
            FROM collection_progress
            WHERE user_id = $1
            ORDER BY collection_type, item_category
        `;
        
        const result = await postgres.query(sql, [userId]);
        
        res.json({
            success: true,
            collections: result.rows
        });
    } catch (error) {
        console.error('Get collection progress error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch collection progress'
        });
    }
});

/**
 * @route GET /api/v1/progression/login-streak
 * @desc Get user's login streak and rewards
 */
router.get('/login-streak', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const today = new Date().toISOString().split('T')[0];
        
        let streak = await postgres.query(
            'SELECT * FROM user_login_streaks WHERE user_id = $1',
            [userId]
        );
        
        if (streak.rows.length === 0) {
            // Initialize streak
            const streakId = generateId('streak');
            await postgres.query(
                `INSERT INTO user_login_streaks (id, user_id, current_streak, longest_streak, last_login_date, total_logins)
                 VALUES ($1, $2, 1, 1, $3, 1)`,
                [streakId, userId, today]
            );
            
            streak = await postgres.query(
                'SELECT * FROM user_login_streaks WHERE user_id = $1',
                [userId]
            );
        } else {
            const lastLogin = streak.rows[0].last_login_date;
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            
            if (lastLogin !== today) {
                let newStreak = streak.rows[0].current_streak;
                
                if (lastLogin !== yesterday) {
                    // Streak broken
                    newStreak = 1;
                } else {
                    // Continue streak
                    newStreak++;
                }
                
                const newLongest = Math.max(newStreak, streak.rows[0].longest_streak);
                
                await postgres.query(
                    `UPDATE user_login_streaks 
                     SET current_streak = $2, longest_streak = $3, last_login_date = $4, total_logins = total_logins + 1, updated_at = NOW()
                     WHERE user_id = $1`,
                    [userId, newStreak, newLongest, today]
                );
            }
        }
        
        const updatedStreak = await postgres.query(
            'SELECT * FROM user_login_streaks WHERE user_id = $1',
            [userId]
        );
        
        res.json({
            success: true,
            streak: updatedStreak.rows[0]
        });
    } catch (error) {
        console.error('Get login streak error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch login streak'
        });
    }
});

/**
 * @route POST /api/v1/progression/claim-achievement/:achievementId
 * @desc Claim achievement reward
 */
router.post('/claim-achievement/:achievementId', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({ success: false, error: 'idempotency-key required' });
    }
    
    try {
        const userId = req.user.id;
        const { achievementId } = req.params;
        
        const mutation = await executeIdempotentMutation({
            scope: 'progression.claim_achievement',
            idempotencyKey,
            requestPayload: { userId, achievementId },
            actorUserId: userId,
            entityType: 'achievement',
            eventType: 'claim_reward',
            mutationFn: async () => {
                await postgres.query('BEGIN');
                
                try {
                    // Get achievement
                    const achievement = await postgres.query(
                        'SELECT * FROM account_achievements WHERE id = $1',
                        [achievementId]
                    );
                    
                    if (achievement.rows.length === 0) {
                        const error = new Error('Achievement not found');
                        error.code = 'ACHIEVEMENT_NOT_FOUND';
                        throw error;
                    }
                    
                    // Check if completed and not claimed
                    const userAchievement = await postgres.query(
                        'SELECT * FROM user_account_achievements WHERE user_id = $1 AND achievement_id = $2 FOR UPDATE',
                        [userId, achievementId]
                    );
                    
                    if (userAchievement.rows.length === 0 || !userAchievement.rows[0].is_completed) {
                        const error = new Error('Achievement not completed');
                        error.code = 'ACHIEVEMENT_NOT_COMPLETED';
                        throw error;
                    }
                    
                    if (userAchievement.rows[0].reward_claimed) {
                        const error = new Error('Reward already claimed');
                        error.code = 'REWARD_ALREADY_CLAIMED';
                        throw error;
                    }
                    
                    // Grant rewards
                    const achData = achievement.rows[0];
                    
                    if (achData.reward_coins > 0) {
                        await postgres.query(
                            'UPDATE users SET horror_coins = horror_coins + $2 WHERE id = $1',
                            [userId, achData.reward_coins]
                        );
                    }
                    
                    if (achData.reward_gems > 0) {
                        // Assuming gems stored in account_credit or similar
                        await postgres.query(
                            'UPDATE users SET account_credit = account_credit + $2 WHERE id = $1',
                            [userId, achData.reward_gems]
                        );
                    }
                    
                    // Grant title if applicable
                    if (achData.reward_title) {
                        const user = await postgres.query('SELECT title FROM users WHERE id = $1', [userId]);
                        const currentTitle = user.rows[0]?.title || '';
                        const newTitle = currentTitle ? `${currentTitle}, ${achData.reward_title}` : achData.reward_title;
                        
                        await postgres.query(
                            'UPDATE users SET title = $2 WHERE id = $1',
                            [userId, newTitle]
                        );
                    }
                    
                    // Mark reward as claimed
                    await postgres.query(
                        `UPDATE user_account_achievements 
                         SET reward_claimed = TRUE, claimed_at = NOW()
                         WHERE user_id = $1 AND achievement_id = $2`,
                        [userId, achievementId]
                    );
                    
                    // Create social feed activity
                    await postgres.query(
                        `INSERT INTO social_feed_activities (user_id, activity_type, activity_data, visibility)
                         VALUES ($1, 'achievement', $2, 'public')`,
                        [userId, JSON.stringify({
                            achievement_id: achievementId,
                            achievement_name: achData.name,
                            achievement_key: achData.achievement_key
                        })]
                    );
                    
                    await postgres.query('COMMIT');
                    
                    return {
                        success: true,
                        claimed: {
                            achievement_id: achievementId,
                            rewards: {
                                coins: achData.reward_coins,
                                gems: achData.reward_gems,
                                title: achData.reward_title
                            }
                        }
                    };
                } catch (error) {
                    await postgres.query('ROLLBACK');
                    throw error;
                }
            }
        });
        
        res.status(200).json(mutation);
    } catch (error) {
        console.error('Claim achievement error:', error);
        res.status(500).json({
            success: false,
            error: error.code || 'CLAIM_FAILED',
            message: error.message || 'Failed to claim achievement'
        });
    }
});

/**
 * @route GET /api/v1/progression/stats-summary
 * @desc Get comprehensive stats summary
 */
router.get('/stats-summary', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get platform mastery stats
        const masteryStats = await postgres.query(
            'SELECT stat_key, stat_value, games_contributed FROM platform_mastery_stats WHERE user_id = $1',
            [userId]
        );
        
        // Get game stats aggregates
        const gameStats = await postgres.query(
            `SELECT game_id, stat_type, stat_value, sessions_count, last_played_at
             FROM game_stats_aggregates
             WHERE user_id = $1
             ORDER BY last_played_at DESC`,
            [userId]
        );
        
        // Get collection progress
        const collections = await postgres.query(
            'SELECT collection_type, total_collected, collection_percentage FROM collection_progress WHERE user_id = $1',
            [userId]
        );
        
        // Get login streak
        const loginStreak = await postgres.query(
            'SELECT current_streak, longest_streak, total_logins, total_playtime_hours FROM user_login_streaks WHERE user_id = $1',
            [userId]
        );
        
        // Get achievement stats
        const achievementStats = await postgres.query(
            `SELECT 
                COUNT(*) FILTER (WHERE is_completed) as completed,
                COUNT(*) FILTER (WHERE reward_claimed) as claimed,
                COUNT(*) as total
             FROM user_account_achievements uaa
             JOIN account_achievements aa ON uaa.achievement_id = aa.id
             WHERE uaa.user_id = $1 AND aa.is_hidden = FALSE`,
            [userId]
        );
        
        res.json({
            success: true,
            summary: {
                platformMastery: masteryStats.rows,
                gameStats: gameStats.rows,
                collections: collections.rows,
                loginStreak: loginStreak.rows[0] || {
                    current_streak: 0,
                    longest_streak: 0,
                    total_logins: 0,
                    total_playtime_hours: 0
                },
                achievements: achievementStats.rows[0] || {
                    completed: 0,
                    claimed: 0,
                    total: 0
                }
            }
        });
    } catch (error) {
        console.error('Get stats summary error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch stats summary'
        });
    }
});

module.exports = router;
