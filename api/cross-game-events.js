/**
 * Phase 2.2: Cross-Game Events & Quests API
 * Weekly meta-quests, limited-time narrative arcs, and community goals
 */

const express = require('express');
const { query } = require('../db/postgres');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Middleware: Authenticate all routes
router.use(authenticateToken);

/**
 * GET /api/events/active
 * Get all active events
 */
router.get('/active', async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get active events
        const eventsResult = await query(`
            SELECT * FROM events 
            WHERE is_active = true 
            AND start_date <= NOW() 
            AND end_date >= NOW()
            ORDER BY priority DESC, start_date ASC
        `);
        
        // Get player's progress for each event
        const eventsWithProgress = await Promise.all(
            eventsResult.rows.map(async (event) => {
                const progressResult = await query(`
                    SELECT * FROM player_event_progress 
                    WHERE user_id = $1 AND event_id = $2
                `, [userId, event.id]);
                
                return {
                    ...event,
                    playerProgress: progressResult.rows[0] || null
                };
            })
        );
        
        res.json({
            success: true,
            data: {
                events: eventsWithProgress,
                total: eventsWithProgress.length
            }
        });
    } catch (error) {
        console.error('Error getting active events:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to load active events' 
        });
    }
});

/**
 * GET /api/events/upcoming
 * Get upcoming events
 */
router.get('/upcoming', async (req, res) => {
    try {
        const eventsResult = await query(`
            SELECT * FROM events 
            WHERE is_active = true 
            AND start_date > NOW()
            ORDER BY start_date ASC
            LIMIT 10
        `);
        
        res.json({
            success: true,
            data: {
                events: eventsResult.rows,
                total: eventsResult.rows.length
            }
        });
    } catch (error) {
        console.error('Error getting upcoming events:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to load upcoming events' 
        });
    }
});

/**
 * GET /api/events/:eventId
 * Get specific event details
 */
router.get('/:eventId', async (req, res) => {
    try {
        const userId = req.user.id;
        const { eventId } = req.params;
        
        const eventResult = await query(`
            SELECT * FROM events WHERE id = $1
        `, [eventId]);
        
        if (eventResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Event not found' 
            });
        }
        
        const event = eventResult.rows[0];
        
        // Get event quests
        const questsResult = await query(`
            SELECT * FROM event_quests 
            WHERE event_id = $1
            ORDER BY difficulty ASC, quest_order ASC
        `, [eventId]);
        
        // Get player's quest progress
        const questsWithProgress = await Promise.all(
            questsResult.rows.map(async (quest) => {
                const progressResult = await query(`
                    SELECT * FROM player_quest_progress 
                    WHERE user_id = $1 AND quest_id = $2
                `, [userId, quest.id]);
                
                return {
                    ...quest,
                    playerProgress: progressResult.rows[0] || null
                };
            })
        );
        
        // Get community goal progress
        const communityResult = await query(`
            SELECT 
                current_progress,
                goal_target,
                is_achieved,
                achieved_at
            FROM event_community_goals 
            WHERE event_id = $1
        `, [eventId]);
        
        res.json({
            success: true,
            data: {
                event: event,
                quests: questsWithProgress,
                communityGoal: communityResult.rows[0] || null
            }
        });
    } catch (error) {
        console.error('Error getting event details:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to load event details' 
        });
    }
});

/**
 * POST /api/events/:eventId/quest/:questId/progress
 * Update quest progress
 */
router.post('/:eventId/quest/:questId/progress', async (req, res) => {
    try {
        const userId = req.user.id;
        const { eventId, questId } = req.params;
        const { progressType, amount = 1, metadata = {} } = req.body;
        
        // Verify event and quest exist
        const eventResult = await query(`
            SELECT * FROM events WHERE id = $1 AND is_active = true
        `, [eventId]);
        
        if (eventResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Event not found' 
            });
        }
        
        const questResult = await query(`
            SELECT * FROM event_quests WHERE id = $1 AND event_id = $2
        `, [questId, eventId]);
        
        if (questResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Quest not found' 
            });
        }
        
        const quest = questResult.rows[0];
        
        // Check if quest is already completed
        const existingProgress = await query(`
            SELECT * FROM player_quest_progress 
            WHERE user_id = $1 AND quest_id = $2
        `, [userId, questId]);
        
        if (existingProgress.rows.length > 0 && existingProgress.rows[0].is_completed) {
            return res.status(400).json({ 
                success: false, 
                error: 'Quest already completed' 
            });
        }
        
        // Calculate new progress
        let newProgress = amount;
        let isCompleted = false;
        
        if (existingProgress.rows.length > 0) {
            newProgress = existingProgress.rows[0].current_progress + amount;
        }
        
        if (newProgress >= quest.target_value) {
            newProgress = quest.target_value;
            isCompleted = true;
        }
        
        // Upsert progress
        if (existingProgress.rows.length === 0) {
            await query(`
                INSERT INTO player_quest_progress 
                (user_id, quest_id, current_progress, is_completed, metadata)
                VALUES ($1, $2, $3, $4, $5)
            `, [userId, questId, newProgress, isCompleted, JSON.stringify(metadata)]);
        } else {
            await query(`
                UPDATE player_quest_progress 
                SET current_progress = $1,
                    is_completed = $2,
                    metadata = $3,
                    updated_at = NOW()
                WHERE user_id = $4 AND quest_id = $5
            `, [newProgress, isCompleted, JSON.stringify(metadata), userId, questId]);
        }
        
        // Award rewards if completed
        let rewardsAwarded = null;
        if (isCompleted && !existingProgress.rows[0]?.is_completed) {
            rewardsAwarded = await awardQuestRewards(userId, quest);
        }
        
        // Update community goal progress
        if (isCompleted) {
            await query(`
                UPDATE event_community_goals 
                SET current_progress = current_progress + 1
                WHERE event_id = $1 AND is_achieved = false
            `, [eventId]);
        }
        
        res.json({
            success: true,
            data: {
                questId: questId,
                currentProgress: newProgress,
                targetValue: quest.target_value,
                isCompleted: isCompleted,
                rewardsAwarded: rewardsAwarded
            }
        });
    } catch (error) {
        console.error('Error updating quest progress:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update quest progress' 
        });
    }
});

/**
 * GET /api/quests/active
 * Get player's active quests (all events)
 */
router.get('/quests/active', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const questsResult = await query(`
            SELECT eq.*, e.title as event_title, e.end_date as event_end_date,
                   pqp.current_progress, pqp.is_completed, pqp.updated_at
            FROM event_quests eq
            JOIN events e ON eq.event_id = e.id
            LEFT JOIN player_quest_progress pqp ON eq.id = pqp.quest_id AND pqp.user_id = $1
            WHERE e.is_active = true 
            AND e.start_date <= NOW() 
            AND e.end_date >= NOW()
            ORDER BY eq.difficulty ASC, eq.quest_order ASC
        `, [userId]);
        
        res.json({
            success: true,
            data: {
                quests: questsResult.rows,
                total: questsResult.rows.length,
                completed: questsResult.rows.filter(q => q.is_completed).length
            }
        });
    } catch (error) {
        console.error('Error getting active quests:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to load active quests' 
        });
    }
});

/**
 * GET /api/quests/meta
 * Get weekly meta-quests spanning multiple games
 */
router.get('/quests/meta', async (req, res) => {
    try {
        const userId = req.user.id;
        
        const metaQuestsResult = await query(`
            SELECT * FROM meta_quests 
            WHERE is_active = true
            AND start_date <= NOW() 
            AND end_date >= NOW()
            ORDER BY difficulty ASC
        `);
        
        const metaQuestsWithProgress = await Promise.all(
            metaQuestsResult.rows.map(async (quest) => {
                const progressResult = await query(`
                    SELECT * FROM player_meta_quest_progress 
                    WHERE user_id = $1 AND meta_quest_id = $2
                `, [userId, quest.id]);
                
                return {
                    ...quest,
                    playerProgress: progressResult.rows[0] || null
                };
            })
        );
        
        res.json({
            success: true,
            data: {
                metaQuests: metaQuestsWithProgress,
                total: metaQuestsWithProgress.length
            }
        });
    } catch (error) {
        console.error('Error getting meta quests:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to load meta quests' 
        });
    }
});

/**
 * POST /api/quests/meta/:questId/progress
 * Update meta-quest progress
 */
router.post('/quests/meta/:questId/progress', async (req, res) => {
    try {
        const userId = req.user.id;
        const { questId } = req.params;
        const { gameId, amount = 1, metadata = {} } = req.body;
        
        const questResult = await query(`
            SELECT * FROM meta_quests WHERE id = $1 AND is_active = true
        `, [questId]);
        
        if (questResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Meta quest not found' 
            });
        }
        
        const quest = questResult.rows[0];
        
        // Check if quest requires specific games
        if (quest.required_games && quest.required_games.length > 0) {
            if (!gameId || !quest.required_games.includes(gameId)) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Invalid game for this meta quest' 
                });
            }
        }
        
        // Get or create progress
        const existingProgress = await query(`
            SELECT * FROM player_meta_quest_progress 
            WHERE user_id = $1 AND meta_quest_id = $2
        `, [userId, questId]);
        
        if (existingProgress.rows.length > 0 && existingProgress.rows[0].is_completed) {
            return res.status(400).json({ 
                success: false, 
                error: 'Meta quest already completed' 
            });
        }
        
        // Track games played for this quest
        let gamesPlayed = existingProgress.rows[0]?.games_played || [];
        if (gameId && !gamesPlayed.includes(gameId)) {
            gamesPlayed.push(gameId);
        }
        
        // Calculate progress
        let newProgress = amount;
        let isCompleted = false;
        
        if (existingProgress.rows.length > 0) {
            newProgress = existingProgress.rows[0].current_progress + amount;
        }
        
        if (newProgress >= quest.target_value) {
            newProgress = quest.target_value;
            isCompleted = true;
        }
        
        // Check if enough unique games played
        const uniqueGamesRequired = quest.required_games?.length || 1;
        if (gamesPlayed.length < uniqueGamesRequired) {
            isCompleted = false;
        }
        
        // Upsert progress
        if (existingProgress.rows.length === 0) {
            await query(`
                INSERT INTO player_meta_quest_progress 
                (user_id, meta_quest_id, current_progress, games_played, is_completed, metadata)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [userId, questId, newProgress, JSON.stringify(gamesPlayed), isCompleted, JSON.stringify(metadata)]);
        } else {
            await query(`
                UPDATE player_meta_quest_progress 
                SET current_progress = $1,
                    games_played = $2,
                    is_completed = $3,
                    metadata = $4,
                    updated_at = NOW()
                WHERE user_id = $5 AND meta_quest_id = $6
            `, [newProgress, JSON.stringify(gamesPlayed), isCompleted, JSON.stringify(metadata), userId, questId]);
        }
        
        // Award rewards if completed
        let rewardsAwarded = null;
        if (isCompleted && !existingProgress.rows[0]?.is_completed) {
            rewardsAwarded = await awardMetaQuestRewards(userId, quest);
        }
        
        res.json({
            success: true,
            data: {
                metaQuestId: questId,
                currentProgress: newProgress,
                targetValue: quest.target_value,
                uniqueGamesPlayed: gamesPlayed.length,
                isCompleted: isCompleted,
                rewardsAwarded: rewardsAwarded
            }
        });
    } catch (error) {
        console.error('Error updating meta quest progress:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update meta quest progress' 
        });
    }
});

/**
 * GET /api/community/goals
 * Get community goals requiring collective play
 */
router.get('/community/goals', async (req, res) => {
    try {
        const goalsResult = await query(`
            SELECT ecg.*, e.title as event_title, e.end_date
            FROM event_community_goals ecg
            JOIN events e ON ecg.event_id = e.id
            WHERE e.is_active = true 
            AND e.end_date >= NOW()
            ORDER BY ecg.priority DESC, e.end_date ASC
        `);
        
        res.json({
            success: true,
            data: {
                communityGoals: goalsResult.rows,
                total: goalsResult.rows.length
            }
        });
    } catch (error) {
        console.error('Error getting community goals:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to load community goals' 
        });
    }
});

/**
 * POST /api/events/claim-rewards
 * Claim event completion rewards
 */
router.post('/claim-rewards', async (req, res) => {
    try {
        const userId = req.user.id;
        const { eventId } = req.body;
        
        if (!eventId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Event ID required' 
            });
        }
        
        // Check if all quests completed
        const questsResult = await query(`
            SELECT eq.id, pqp.is_completed
            FROM event_quests eq
            LEFT JOIN player_quest_progress pqp ON eq.id = pqp.quest_id AND pqp.user_id = $1
            WHERE eq.event_id = $2
        `, [userId, eventId]);
        
        const allCompleted = questsResult.rows.every(q => q.is_completed);
        
        if (!allCompleted) {
            return res.status(400).json({ 
                success: false, 
                error: 'Not all quests completed' 
            });
        }
        
        // Check if already claimed
        const existingClaim = await query(`
            SELECT * FROM player_event_rewards 
            WHERE user_id = $1 AND event_id = $2
        `, [userId, eventId]);
        
        if (existingClaim.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Rewards already claimed' 
            });
        }
        
        // Get event rewards
        const eventResult = await query(`
            SELECT reward_pool FROM events WHERE id = $1
        `, [eventId]);
        
        if (eventResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Event not found' 
            });
        }
        
        const rewards = eventResult.rows[0].reward_pool;
        
        // Award rewards
        await awardEventRewards(userId, rewards);
        
        // Record reward claim
        await query(`
            INSERT INTO player_event_rewards (user_id, event_id, rewards_claimed)
            VALUES ($1, $2, $3)
        `, [userId, eventId, JSON.stringify(rewards)]);
        
        res.json({
            success: true,
            data: {
                eventId: eventId,
                rewards: rewards
            }
        });
    } catch (error) {
        console.error('Error claiming rewards:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to claim rewards' 
        });
    }
});

// Helper Functions

async function awardQuestRewards(userId, quest) {
    const rewards = quest.rewards;
    
    // Award soul fragments
    if (rewards.soulFragments) {
        await query(`
            UPDATE player_profiles 
            SET soul_fragments = soul_fragments + $1,
                earned_soul_fragments = earned_soul_fragments + $1
            WHERE user_id = $2
        `, [rewards.soulFragments, userId]);
    }
    
    // Add items to inventory
    if (rewards.items && rewards.items.length > 0) {
        for (const item of rewards.items) {
            await query(`
                INSERT INTO shared_inventory 
                (player_profile_id, item_id, item_type, item_name, item_rarity, item_source, metadata)
                SELECT id, $2, $3, $4, $5, 'event', $6
                FROM player_profiles WHERE user_id = $1
            `, [userId, item.id, item.type, item.name, item.rarity, JSON.stringify(item)]);
        }
    }
    
    return rewards;
}

async function awardMetaQuestRewards(userId, quest) {
    return await awardQuestRewards(userId, quest);
}

async function awardEventRewards(userId, rewards) {
    // Similar to quest rewards but for event completion
    if (rewards.soulFragments) {
        await query(`
            UPDATE player_profiles 
            SET soul_fragments = soul_fragments + $1,
                earned_soul_fragments = earned_soul_fragments + $1
            WHERE user_id = $2
        `, [rewards.soulFragments, userId]);
    }
    
    if (rewards.items && rewards.items.length > 0) {
        for (const item of rewards.items) {
            await query(`
                INSERT INTO shared_inventory 
                (player_profile_id, item_id, item_type, item_name, item_rarity, item_source, metadata)
                SELECT id, $2, $3, $4, $5, 'event', $6
                FROM player_profiles WHERE user_id = $1
            `, [userId, item.id, item.type, item.name, item.rarity, JSON.stringify(item)]);
        }
    }
}

module.exports = router;
