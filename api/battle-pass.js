/**
 * Multi-Tier Battle Pass API - Phase 3
 * Free/Premium/Elite/Clan tracks with complex progression
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireMonetizationAuth } = require('../middleware/auth');
const postgres = require('../models/postgres');
const { executeIdempotentMutation, appendAuditEvent } = require('../services/economyMutationService');

/**
 * Helper: Generate unique ID
 */
function generateId(prefix = 'bp') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Helper: Calculate XP required for tier
 * Complex formula: scales with tier number
 */
function calculateXpForTier(tier) {
    const baseXp = 100;
    const scalingFactor = 1.15;
    return Math.floor(baseXp * Math.pow(scalingFactor, tier - 1));
}

/**
 * Helper: Apply XP boosters
 */
async function applyXpBoosters(userId, baseXp) {
    const boostersResult = await postgres.query(
        `SELECT xb.*, xb2.boost_value, xb2.duration_minutes
         FROM user_xp_boosters xb
         JOIN xp_boosters xb2 ON xb.booster_id = xb2.id
         WHERE xb.user_id = $1 AND xb.is_active = TRUE AND xb.expires_at > NOW()`,
        [userId]
    );
    
    let totalMultiplier = 1;
    let totalFlatBonus = 0;
    
    for (const booster of boostersResult.rows) {
        if (booster.booster_type === 'percentage') {
            totalMultiplier += (booster.boost_value / 100);
        } else if (booster.booster_type === 'flat') {
            totalFlatBonus += booster.boost_value;
        }
    }
    
    const boostedXp = Math.floor((baseXp * totalMultiplier) + totalFlatBonus);
    
    return {
        originalXp: baseXp,
        boostedXp,
        multiplier: totalMultiplier,
        flatBonus: totalFlatBonus,
        activeBoosters: boostersResult.rows
    };
}

/**
 * @route GET /api/v1/battle-pass/season/:seasonId
 * @desc Get battle pass season details with all tiers
 */
router.get('/season/:seasonId', authMiddleware, async (req, res) => {
    try {
        const { seasonId } = req.params;
        
        const seasonSql = `
            SELECT 
                id,
                season_number,
                name,
                theme,
                start_date,
                end_date,
                max_tier,
                is_active,
                metadata,
                CASE 
                    WHEN NOW() < start_date THEN 'upcoming'
                    WHEN NOW() BETWEEN start_date AND end_date THEN 'active'
                    ELSE 'ended'
                END as status
            FROM battle_pass_seasons
            WHERE id = $1
        `;
        
        const seasonResult = await postgres.query(seasonSql, [seasonId]);
        
        if (seasonResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Season not found'
            });
        }
        
        const tiersSql = `
            SELECT *
            FROM battle_pass_tiers
            WHERE season_id = $1
            ORDER BY tier_number ASC
        `;
        
        const tiersResult = await postgres.query(tiersSql, [seasonId]);
        
        const challengesSql = `
            SELECT *
            FROM battle_pass_challenges
            WHERE season_id = $1
            AND expires_at > NOW()
            ORDER BY 
                CASE challenge_type
                    WHEN 'daily' THEN 1
                    WHEN 'weekly' THEN 2
                    WHEN 'seasonal' THEN 3
                    WHEN 'event' THEN 4
                END,
                expires_at ASC
        `;
        
        const challengesResult = await postgres.query(challengesSql, [seasonId]);
        
        res.json({
            success: true,
            season: {
                ...seasonResult.rows[0],
                tiers: tiersResult.rows,
                activeChallenges: challengesResult.rows
            }
        });
    } catch (error) {
        console.error('Get battle pass season error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch battle pass season'
        });
    }
});

/**
 * @route GET /api/v1/battle-pass/my-progress/:seasonId
 * @desc Get user's battle pass progress for all tracks
 */
router.get('/my-progress/:seasonId', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { seasonId } = req.params;
        
        const progressSql = `
            SELECT 
                ubp.*,
                bps.max_tier,
                bps.end_date
            FROM user_battle_pass ubp
            JOIN battle_pass_seasons bps ON ubp.season_id = bps.id
            WHERE ubp.user_id = $1 AND ubp.season_id = $2
        `;
        
        const progressResult = await postgres.query(progressSql, [userId, seasonId]);
        
        if (progressResult.rows.length === 0) {
            return res.json({
                success: true,
                progress: null
            });
        }
        
        const progress = progressResult.rows[0];
        
        // Get challenge progress
        const challengesSql = `
            SELECT 
                ucp.*,
                bpc.name as challenge_name,
                bpc.xp_reward,
                bpc.challenge_type
            FROM user_challenge_progress ucp
            JOIN battle_pass_challenges bpc ON ucp.challenge_id = bpc.id
            WHERE ucp.user_id = $1 AND bpc.season_id = $2
            ORDER BY ucp.completed_at DESC NULLS LAST
        `;
        
        const challengesResult = await postgres.query(challengesSql, [userId, seasonId]);
        
        // Calculate XP needed for next tier on each track
        const nextTierXp = {
            free: calculateXpForTier(progress.free_track_level + 1),
            premium: calculateXpForTier(progress.premium_track_level + 1),
            elite: calculateXpForTier(progress.elite_track_level + 1),
            clan: calculateXpForTier(progress.clan_track_level + 1)
        };
        
        res.json({
            success: true,
            progress: {
                ...progress,
                challenges: challengesResult.rows,
                nextTierXp,
                xpToNextTier: {
                    free: nextTierXp.free - progress.free_track_xp,
                    premium: nextTierXp.premium - progress.premium_track_xp,
                    elite: nextTierXp.elite - progress.elite_track_xp,
                    clan: nextTierXp.clan - progress.clan_track_xp
                }
            }
        });
    } catch (error) {
        console.error('Get battle pass progress error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch battle pass progress'
        });
    }
});

/**
 * @route POST /api/v1/battle-pass/initialize/:seasonId
 * @desc Initialize user's battle pass for a season
 */
router.post('/initialize/:seasonId', authMiddleware, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({
            success: false,
            error: 'idempotency-key header required'
        });
    }
    
    try {
        const userId = req.user.id;
        const { seasonId } = req.params;
        
        // Check if season exists and is active
        const season = await postgres.query(
            'SELECT * FROM battle_pass_seasons WHERE id = $1',
            [seasonId]
        );
        
        if (season.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Season not found'
            });
        }
        
        if (!season.rows[0].is_active) {
            return res.status(409).json({
                success: false,
                error: 'Season is not currently active'
            });
        }
        
        const mutation = await executeIdempotentMutation({
            scope: 'battle_pass.initialize',
            idempotencyKey,
            requestPayload: { userId, seasonId },
            actorUserId: userId,
            entityType: 'battle_pass',
            eventType: 'initialize',
            mutationFn: async () => {
                // Check if already initialized
                const existing = await postgres.query(
                    'SELECT id FROM user_battle_pass WHERE user_id = $1 AND season_id = $2',
                    [userId, seasonId]
                );
                
                if (existing.rows.length > 0) {
                    return {
                        success: true,
                        alreadyInitialized: true,
                        message: 'Battle pass already initialized for this season'
                    };
                }
                
                const bpId = generateId('ubp');
                
                await postgres.query(
                    `INSERT INTO user_battle_pass (
                        id, user_id, season_id,
                        free_track_level, free_track_xp,
                        premium_track_level, premium_track_xp,
                        elite_track_level, elite_track_xp,
                        clan_track_level, clan_track_xp
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [bpId, userId, seasonId, 1, 0, 1, 0, 1, 0, 1, 0]
                );
                
                return {
                    success: true,
                    alreadyInitialized: false,
                    battlePass: {
                        id: bpId,
                        user_id: userId,
                        season_id: seasonId
                    }
                };
            }
        });
        
        res.status(201).json(mutation);
    } catch (error) {
        console.error('Initialize battle pass error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to initialize battle pass'
        });
    }
});

/**
 * @route POST /api/v1/battle-pass/upgrade-pass/:seasonId
 * @desc Upgrade to Premium or Elite pass
 */
router.post('/upgrade-pass/:seasonId', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({
            success: false,
            error: 'idempotency-key header required'
        });
    }
    
    try {
        const userId = req.user.id;
        const { seasonId } = req.params;
        const { tier } = req.body; // 'premium' or 'elite'
        
        if (!tier || !['premium', 'elite'].includes(tier)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid tier. Must be "premium" or "elite"'
            });
        }
        
        const mutation = await executeIdempotentMutation({
            scope: 'battle_pass.upgrade',
            idempotencyKey,
            requestPayload: { userId, seasonId, tier },
            actorUserId: userId,
            entityType: 'battle_pass',
            eventType: 'upgrade',
            mutationFn: async () => {
                await postgres.query('BEGIN');
                
                try {
                    // Get battle pass record
                    const bpResult = await postgres.query(
                        'SELECT * FROM user_battle_pass WHERE user_id = $1 AND season_id = $2 FOR UPDATE',
                        [userId, seasonId]
                    );
                    
                    if (bpResult.rows.length === 0) {
                        const error = new Error('Battle pass not initialized');
                        error.code = 'BP_NOT_INITIALIZED';
                        throw error;
                    }
                    
                    const bp = bpResult.rows[0];
                    
                    // Check if already upgraded
                    if (tier === 'premium' && bp.premium_pass) {
                        const error = new Error('Already have premium pass');
                        error.code = 'ALREADY_PREMIUM';
                        throw error;
                    }
                    
                    if (tier === 'elite' && bp.elite_pass) {
                        const error = new Error('Already have elite pass');
                        error.code = 'ALREADY_ELITE';
                        throw error;
                    }
                    
                    // Get season data
                    const season = await postgres.query(
                        'SELECT * FROM battle_pass_seasons WHERE id = $1',
                        [seasonId]
                    );
                    
                    if (!season.rows[0].is_active) {
                        const error = new Error('Season is not active');
                        error.code = 'SEASON_NOT_ACTIVE';
                        throw error;
                    }
                    
                    // Update battle pass
                    let updateQuery;
                    let updateParams;
                    
                    if (tier === 'premium') {
                        updateQuery = `
                            UPDATE user_battle_pass
                            SET premium_pass = TRUE, purchased_at = NOW()
                            WHERE id = $1
                            RETURNING *
                        `;
                        updateParams = [bp.id];
                    } else {
                        updateQuery = `
                            UPDATE user_battle_pass
                            SET premium_pass = TRUE, elite_pass = TRUE, elite_purchased_at = NOW()
                            WHERE id = $1
                            RETURNING *
                        `;
                        updateParams = [bp.id];
                    }
                    
                    const updated = await postgres.query(updateQuery, updateParams);
                    
                    // Grant immediate rewards (if any)
                    // This would typically grant bonus items for upgrading
                    
                    await postgres.query('COMMIT');
                    
                    return {
                        success: true,
                        upgraded: true,
                        tier,
                        battlePass: updated.rows[0]
                    };
                } catch (error) {
                    await postgres.query('ROLLBACK');
                    throw error;
                }
            }
        });
        
        res.status(200).json(mutation);
    } catch (error) {
        console.error('Upgrade battle pass error:', error);
        const statusMap = {
            'BP_NOT_INITIALIZED': 404,
            'ALREADY_PREMIUM': 409,
            'ALREADY_ELITE': 409,
            'SEASON_NOT_ACTIVE': 409
        };
        res.status(statusMap[error.code] || 500).json({
            success: false,
            error: error.code || 'UPGRADE_FAILED',
            message: error.message || 'Failed to upgrade battle pass'
        });
    }
});

/**
 * @route POST /api/v1/battle-pass/claim-tier/:seasonId
 * @desc Claim rewards for a specific tier
 */
router.post('/claim-tier/:seasonId', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({
            success: false,
            error: 'idempotency-key header required'
        });
    }
    
    try {
        const userId = req.user.id;
        const { seasonId } = req.params;
        const { tier_number, track } = req.body; // track: 'free', 'premium', 'elite', 'clan'
        
        if (!tier_number || !track) {
            return res.status(400).json({
                success: false,
                error: 'tier_number and track required'
            });
        }
        
        const mutation = await executeIdempotentMutation({
            scope: 'battle_pass.claim_tier',
            idempotencyKey,
            requestPayload: { userId, seasonId, tier_number, track },
            actorUserId: userId,
            entityType: 'battle_pass',
            eventType: 'claim_tier',
            mutationFn: async () => {
                await postgres.query('BEGIN');
                
                try {
                    // Get battle pass
                    const bpResult = await postgres.query(
                        'SELECT * FROM user_battle_pass WHERE user_id = $1 AND season_id = $2 FOR UPDATE',
                        [userId, seasonId]
                    );
                    
                    if (bpResult.rows.length === 0) {
                        const error = new Error('Battle pass not initialized');
                        error.code = 'BP_NOT_INITIALIZED';
                        throw error;
                    }
                    
                    const bp = bpResult.rows[0];
                    
                    // Check if tier already claimed
                    const claimedTiers = bp.tiers_claimed || [];
                    const claimKey = `${track}_${tier_number}`;
                    
                    if (claimedTiers.includes(claimKey)) {
                        const error = new Error('Tier already claimed');
                        error.code = 'TIER_ALREADY_CLAIMED';
                        throw error;
                    }
                    
                    // Check if user has reached required tier
                    const currentTier = bp[`${track}_track_level`];
                    if (currentTier < tier_number) {
                        const error = new Error('Tier not yet reached');
                        error.code = 'TIER_NOT_REACHED';
                        throw error;
                    }
                    
                    // Check pass requirements for premium/elite tracks
                    if (track === 'premium' && !bp.premium_pass) {
                        const error = new Error('Premium pass required');
                        error.code = 'PREMIUM_REQUIRED';
                        throw error;
                    }
                    
                    if (track === 'elite' && !bp.elite_pass) {
                        const error = new Error('Elite pass required');
                        error.code = 'ELITE_REQUIRED';
                        throw error;
                    }
                    
                    // Get tier rewards
                    const tierResult = await postgres.query(
                        'SELECT * FROM battle_pass_tiers WHERE season_id = $1 AND tier_number = $2',
                        [seasonId, tier_number]
                    );
                    
                    if (tierResult.rows.length === 0) {
                        const error = new Error('Tier not found');
                        error.code = 'TIER_NOT_FOUND';
                        throw error;
                    }
                    
                    const tier = tierResult.rows[0];
                    const reward = tier[`${track}_reward`];
                    
                    if (!reward || Object.keys(reward).length === 0) {
                        const error = new Error('No reward for this tier/track');
                        error.code = 'NO_REWARD';
                        throw error;
                    }
                    
                    // Grant reward (simplified - would integrate with inventory system)
                    console.log(`Granting reward: ${JSON.stringify(reward)}`);
                    
                    // Mark tier as claimed
                    claimedTiers.push(claimKey);
                    await postgres.query(
                        'UPDATE user_battle_pass SET tiers_claimed = $2 WHERE id = $1',
                        [bp.id, JSON.stringify(claimedTiers)]
                    );
                    
                    await postgres.query('COMMIT');
                    
                    return {
                        success: true,
                        claimed: true,
                        tier: tier_number,
                        track,
                        reward
                    };
                } catch (error) {
                    await postgres.query('ROLLBACK');
                    throw error;
                }
            }
        });
        
        res.status(200).json(mutation);
    } catch (error) {
        console.error('Claim tier error:', error);
        const statusMap = {
            'BP_NOT_INITIALIZED': 404,
            'TIER_ALREADY_CLAIMED': 409,
            'TIER_NOT_REACHED': 409,
            'PREMIUM_REQUIRED': 403,
            'ELITE_REQUIRED': 403,
            'TIER_NOT_FOUND': 404,
            'NO_REWARD': 404
        };
        res.status(statusMap[error.code] || 500).json({
            success: false,
            error: error.code || 'CLAIM_FAILED',
            message: error.message || 'Failed to claim tier reward'
        });
    }
});

/**
 * @route POST /api/v1/battle-pass/complete-challenge/:challengeId
 * @desc Complete a battle pass challenge and claim XP
 */
router.post('/complete-challenge/:challengeId', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({
            success: false,
            error: 'idempotency-key header required'
        });
    }
    
    try {
        const userId = req.user.id;
        const { challengeId } = req.params;
        const { objective_index } = req.body; // Optional: specific objective to complete
        
        const mutation = await executeIdempotentMutation({
            scope: 'battle_pass.complete_challenge',
            idempotencyKey,
            requestPayload: { userId, challengeId, objective_index },
            actorUserId: userId,
            entityType: 'battle_pass_challenge',
            eventType: 'complete',
            mutationFn: async () => {
                await postgres.query('BEGIN');
                
                try {
                    // Get challenge
                    const challenge = await postgres.query(
                        'SELECT * FROM battle_pass_challenges WHERE id = $1',
                        [challengeId]
                    );
                    
                    if (challenge.rows.length === 0) {
                        const error = new Error('Challenge not found');
                        error.code = 'CHALLENGE_NOT_FOUND';
                        throw error;
                    }
                    
                    const challengeData = challenge.rows[0];
                    
                    // Check if challenge is active
                    if (new Date(challengeData.expires_at) < new Date()) {
                        const error = new Error('Challenge has expired');
                        error.code = 'CHALLENGE_EXPIRED';
                        throw error;
                    }
                    
                    // Get or create progress
                    let progressResult = await postgres.query(
                        'SELECT * FROM user_challenge_progress WHERE user_id = $1 AND challenge_id = $2',
                        [userId, challengeId]
                    );
                    
                    if (progressResult.rows.length === 0) {
                        // Initialize progress
                        const progressId = generateId('ucp');
                        await postgres.query(
                            `INSERT INTO user_challenge_progress (
                                id, user_id, challenge_id, progress, is_completed
                            ) VALUES ($1, $2, $3, $4, $5)`,
                            [progressId, userId, challengeId, JSON.stringify([]), false]
                        );
                        
                        progressResult = await postgres.query(
                            'SELECT * FROM user_challenge_progress WHERE user_id = $1 AND challenge_id = $2',
                            [userId, challengeId]
                        );
                    }
                    
                    const progress = progressResult.rows[0];
                    
                    // Check completion limit
                    if (challengeData.completion_limit && progress.completions >= challengeData.completion_limit) {
                        const error = new Error('Challenge completion limit reached');
                        error.code = 'COMPLETION_LIMIT_REACHED';
                        throw error;
                    }
                    
                    // Check if already completed and XP claimed
                    if (progress.xp_claimed) {
                        const error = new Error('XP already claimed for this challenge');
                        error.code = 'XP_ALREADY_CLAIMED';
                        throw error;
                    }
                    
                    // Mark challenge as completed
                    const now = new Date().toISOString();
                    await postgres.query(
                        `UPDATE user_challenge_progress
                         SET is_completed = TRUE, completed_at = $2
                         WHERE id = $1`,
                        [progress.id, now]
                    );
                    
                    // Apply XP boosters
                    const xpBoost = await applyXpBoosters(userId, challengeData.xp_reward);
                    
                    // Grant XP to all active tracks
                    const bpResult = await postgres.query(
                        'SELECT * FROM user_battle_pass WHERE user_id = $1 AND season_id = $2',
                        [userId, challengeData.season_id]
                    );
                    
                    if (bpResult.rows.length > 0) {
                        const bp = bpResult.rows[0];
                        
                        // Update free track
                        await postgres.query(
                            'UPDATE user_battle_pass SET free_track_xp = free_track_xp + $2 WHERE id = $1',
                            [bp.id, xpBoost.boostedXp]
                        );
                        
                        // Update premium track if user has premium
                        if (bp.premium_pass) {
                            await postgres.query(
                                'UPDATE user_battle_pass SET premium_track_xp = premium_track_xp + $2 WHERE id = $1',
                                [bp.id, xpBoost.boostedXp]
                            );
                        }
                        
                        // Update elite track if user has elite
                        if (bp.elite_pass) {
                            await postgres.query(
                                'UPDATE user_battle_pass SET elite_track_xp = elite_track_xp + $2 WHERE id = $1',
                                [bp.id, xpBoost.boostedXp]
                            );
                        }
                    }
                    
                    // Mark XP as claimed
                    await postgres.query(
                        `UPDATE user_challenge_progress
                         SET xp_claimed = TRUE, claimed_at = NOW()
                         WHERE id = $1`,
                        [progress.id]
                    );
                    
                    // Increment completions
                    await postgres.query(
                        'UPDATE user_challenge_progress SET completions = completions + 1 WHERE id = $1',
                        [progress.id]
                    );
                    
                    await postgres.query('COMMIT');
                    
                    return {
                        success: true,
                        completed: true,
                        challenge: {
                            id: challengeId,
                            name: challengeData.name,
                            xpReward: xpBoost
                        },
                        completions: progress.completions + 1
                    };
                } catch (error) {
                    await postgres.query('ROLLBACK');
                    throw error;
                }
            }
        });
        
        res.status(200).json(mutation);
    } catch (error) {
        console.error('Complete challenge error:', error);
        const statusMap = {
            'CHALLENGE_NOT_FOUND': 404,
            'CHALLENGE_EXPIRED': 409,
            'COMPLETION_LIMIT_REACHED': 409,
            'XP_ALREADY_CLAIMED': 409
        };
        res.status(statusMap[error.code] || 500).json({
            success: false,
            error: error.code || 'COMPLETE_CHALLENGE_FAILED',
            message: error.message || 'Failed to complete challenge'
        });
    }
});

/**
 * @route GET /api/v1/battle-pass/leaderboard/:seasonId
 * @desc Get battle pass leaderboard
 */
router.get('/leaderboard/:seasonId', authMiddleware, async (req, res) => {
    try {
        const { seasonId } = req.params;
        const { limit = 100, track = 'free' } = req.query;
        
        const leaderboardSql = `
            SELECT 
                u.username,
                u.avatar,
                ubp.${track}_track_level as level,
                ubp.${track}_track_xp as xp,
                ubp.premium_pass,
                ubp.elite_pass,
                ROW_NUMBER() OVER (ORDER BY ubp.${track}_track_level DESC, ubp.${track}_track_xp DESC) as rank
            FROM user_battle_pass ubp
            JOIN users u ON ubp.user_id = u.id
            WHERE ubp.season_id = $1
            ORDER BY ubp.${track}_track_level DESC, ubp.${track}_track_xp DESC
            LIMIT $2
        `;
        
        const result = await postgres.query(leaderboardSql, [seasonId, parseInt(limit)]);
        
        res.json({
            success: true,
            leaderboard: result.rows,
            track,
            seasonId
        });
    } catch (error) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch leaderboard'
        });
    }
});

module.exports = router;
