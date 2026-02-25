/**
 * Battle Pass Acceleration API - Phase 3
 * XP Boosters, Tier Skips, Catch-up Mechanics
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireMonetizationAuth } = require('../middleware/auth');
const postgres = require('../models/postgres');
const { executeIdempotentMutation } = require('../services/economyMutationService');

function generateId(prefix = 'acc') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * @route GET /api/v1/acceleration/boosters
 * @desc Get available XP boosters
 */
router.get('/boosters', authMiddleware, async (req, res) => {
    try {
        const sql = `
            SELECT *
            FROM xp_boosters
            WHERE is_active = TRUE
            ORDER BY gem_cost ASC
        `;
        
        const result = await postgres.query(sql);
        
        res.json({
            success: true,
            boosters: result.rows
        });
    } catch (error) {
        console.error('Get boosters error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch boosters'
        });
    }
});

/**
 * @route POST /api/v1/acceleration/booster/purchase
 * @desc Purchase XP booster
 */
router.post('/booster/purchase', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({ success: false, error: 'idempotency-key required' });
    }
    
    try {
        const userId = req.user.id;
        const { booster_id, quantity = 1 } = req.body;
        
        const mutation = await executeIdempotentMutation({
            scope: 'acceleration.purchase_booster',
            idempotencyKey,
            requestPayload: { userId, booster_id, quantity },
            actorUserId: userId,
            entityType: 'xp_booster',
            eventType: 'purchase',
            mutationFn: async () => {
                await postgres.query('BEGIN');
                
                try {
                    const booster = await postgres.query('SELECT * FROM xp_boosters WHERE id = $1', [booster_id]);
                    
                    if (booster.rows.length === 0) {
                        const error = new Error('Booster not found');
                        error.code = 'BOOSTER_NOT_FOUND';
                        throw error;
                    }
                    
                    const boosterData = booster.rows[0];
                    const totalCost = boosterData.gem_cost * quantity;
                    
                    // Check user has gems
                    const user = await postgres.query('SELECT horror_coins FROM users WHERE id = $1 FOR UPDATE', [userId]);
                    if (user.rows[0].horror_coins < totalCost) {
                        const error = new Error('Insufficient gems');
                        error.code = 'INSUFFICIENT_GEMS';
                        throw error;
                    }
                    
                    // Deduct gems
                    await postgres.query(
                        'UPDATE users SET horror_coins = horror_coins - $2 WHERE id = $1',
                        [userId, totalCost]
                    );
                    
                    // Add booster to inventory
                    await postgres.query(
                        `INSERT INTO user_xp_boosters (user_id, booster_id, quantity)
                         VALUES ($1, $2, $3)
                         ON CONFLICT (user_id, booster_id)
                         DO UPDATE SET quantity = user_xp_boosters.quantity + $3`,
                        [userId, booster_id, quantity]
                    );
                    
                    await postgres.query('COMMIT');
                    
                    return {
                        success: true,
                        purchased: {
                            booster_id,
                            quantity,
                            totalCost
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
        console.error('Purchase booster error:', error);
        res.status(500).json({
            success: false,
            error: error.code || 'PURCHASE_FAILED',
            message: error.message || 'Failed to purchase booster'
        });
    }
});

/**
 * @route POST /api/v1/acceleration/booster/activate
 * @desc Activate XP booster
 */
router.post('/booster/activate', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({ success: false, error: 'idempotency-key required' });
    }
    
    try {
        const userId = req.user.id;
        const { booster_id } = req.body;
        
        const mutation = await executeIdempotentMutation({
            scope: 'acceleration.activate_booster',
            idempotencyKey,
            requestPayload: { userId, booster_id },
            actorUserId: userId,
            entityType: 'xp_booster',
            eventType: 'activate',
            mutationFn: async () => {
                await postgres.query('BEGIN');
                
                try {
                    const userBooster = await postgres.query(
                        'SELECT * FROM user_xp_boosters WHERE user_id = $1 AND booster_id = $2 FOR UPDATE',
                        [userId, booster_id]
                    );
                    
                    if (userBooster.rows.length === 0 || userBooster.rows[0].quantity <= 0) {
                        const error = new Error('Booster not owned');
                        error.code = 'BOOSTER_NOT_OWNED';
                        throw error;
                    }
                    
                    const booster = await postgres.query('SELECT * FROM xp_boosters WHERE id = $1', [booster_id]);
                    const boosterData = booster.rows[0];
                    
                    // Deactivate other boosters if not stackable
                    if (!boosterData.is_stackable) {
                        await postgres.query(
                            `UPDATE user_xp_boosters
                             SET is_active = FALSE, activated_at = NULL, expires_at = NULL
                             WHERE user_id = $1 AND is_active = TRUE`,
                            [userId]
                        );
                    }
                    
                    // Calculate expiration
                    let expiresAt = null;
                    if (boosterData.duration_minutes) {
                        expiresAt = new Date(Date.now() + boosterData.duration_minutes * 60000);
                    }
                    
                    // Activate booster
                    await postgres.query(
                        `UPDATE user_xp_boosters
                         SET is_active = TRUE, activated_at = NOW(), expires_at = $2,
                             uses_remaining = $3
                         WHERE user_id = $1 AND booster_id = $4`,
                        [userId, expiresAt, boosterData.max_uses, booster_id]
                    );
                    
                    // Decrement quantity
                    await postgres.query(
                        'UPDATE user_xp_boosters SET quantity = quantity - 1 WHERE user_id = $1 AND booster_id = $2',
                        [userId, booster_id]
                    );
                    
                    await postgres.query('COMMIT');
                    
                    return {
                        success: true,
                        activated: {
                            booster_id,
                            expires_at: expiresAt,
                            duration_minutes: boosterData.duration_minutes
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
        console.error('Activate booster error:', error);
        res.status(500).json({
            success: false,
            error: error.code || 'ACTIVATE_FAILED',
            message: error.message || 'Failed to activate booster'
        });
    }
});

/**
 * @route POST /api/v1/acceleration/tier-jump
 * @desc Purchase tier skip bundle
 */
router.post('/tier-jump', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({ success: false, error: 'idempotency-key required' });
    }
    
    try {
        const userId = req.user.id;
        const { bundle_id, season_id, track = 'free' } = req.body;
        
        const mutation = await executeIdempotentMutation({
            scope: 'acceleration.tier_jump',
            idempotencyKey,
            requestPayload: { userId, bundle_id, season_id, track },
            actorUserId: userId,
            entityType: 'tier_jump',
            eventType: 'purchase',
            mutationFn: async () => {
                await postgres.query('BEGIN');
                
                try {
                    const bundle = await postgres.query('SELECT * FROM tier_jump_bundles WHERE id = $1', [bundle_id]);
                    
                    if (bundle.rows.length === 0) {
                        const error = new Error('Bundle not found');
                        error.code = 'BUNDLE_NOT_FOUND';
                        throw error;
                    }
                    
                    const bundleData = bundle.rows[0];
                    
                    // Check purchase limit
                    const purchases = await postgres.query(
                        'SELECT COUNT(*) as count FROM user_tier_jumps WHERE user_id = $1 AND season_id = $2 AND bundle_id = $3',
                        [userId, season_id, bundle_id]
                    );
                    
                    if (parseInt(purchases.rows[0].count) >= bundleData.max_purchases_per_season) {
                        const error = new Error('Purchase limit reached for this bundle');
                        error.code = 'PURCHASE_LIMIT_REACHED';
                        throw error;
                    }
                    
                    // Check user has currency
                    const user = await postgres.query('SELECT horror_coins FROM users WHERE id = $1 FOR UPDATE', [userId]);
                    if (user.rows[0].horror_coins < bundleData.gem_cost) {
                        const error = new Error('Insufficient gems');
                        error.code = 'INSUFFICIENT_GEMS';
                        throw error;
                    }
                    
                    // Deduct cost
                    await postgres.query(
                        'UPDATE users SET horror_coins = horror_coins - $2 WHERE id = $1',
                        [userId, bundleData.gem_cost]
                    );
                    
                    // Grant tiers
                    const bp = await postgres.query(
                        'SELECT * FROM user_battle_pass WHERE user_id = $1 AND season_id = $2 FOR UPDATE',
                        [userId, season_id]
                    );
                    
                    if (bp.rows.length === 0) {
                        const error = new Error('Battle pass not initialized');
                        error.code = 'BP_NOT_INITIALIZED';
                        throw error;
                    }
                    
                    const currentLevel = bp.rows[0][`${track}_track_level`];
                    const newLevel = Math.min(currentLevel + bundleData.tier_count, 100);
                    
                    await postgres.query(
                        `UPDATE user_battle_pass
                         SET ${track}_track_level = $2, tier_jumps_used = tier_jumps_used + 1
                         WHERE id = $1`,
                        [bp.rows[0].id, newLevel]
                    );
                    
                    // Record purchase
                    await postgres.query(
                        `INSERT INTO user_tier_jumps (user_id, season_id, bundle_id, tiers_purchased, track_type, gem_cost)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [userId, season_id, bundle_id, bundleData.tier_count, track, bundleData.gem_cost]
                    );
                    
                    await postgres.query('COMMIT');
                    
                    return {
                        success: true,
                        tierJump: {
                            old_level: currentLevel,
                            new_level: newLevel,
                            tiers_added: bundleData.tier_count,
                            cost: bundleData.gem_cost
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
        console.error('Tier jump error:', error);
        res.status(500).json({
            success: false,
            error: error.code || 'TIER_JUMP_FAILED',
            message: error.message || 'Failed to purchase tier jump'
        });
    }
});

/**
 * @route GET /api/v1/acceleration/catch-up-status/:seasonId
 * @desc Get catch-up mechanics status
 */
router.get('/catch-up-status/:seasonId', authMiddleware, async (req, res) => {
    try {
        const { seasonId } = req.params;
        const userId = req.user.id;
        
        // Get active catch-up mechanics
        const mechanicsSql = `
            SELECT *
            FROM catch_up_mechanics
            WHERE season_id = $1 AND is_active = TRUE AND expires_at > NOW()
            ORDER BY starts_at ASC
        `;
        
        const mechanicsResult = await postgres.query(mechanicsSql, [seasonId]);
        
        // Get user's battle pass progress
        const bpSql = `
            SELECT *
            FROM user_battle_pass
            WHERE user_id = $1 AND season_id = $2
        `;
        
        const bpResult = await postgres.query(bpSql, [userId, seasonId]);
        
        if (bpResult.rows.length === 0) {
            return res.json({
                success: true,
                catchUp: {
                    eligible: false,
                    reason: 'Battle pass not initialized'
                }
            });
        }
        
        const bp = bpResult.rows[0];
        
        // Get average level of top players
        const avgSql = `
            SELECT AVG(free_track_level) as avg_level
            FROM user_battle_pass
            WHERE season_id = $1
            AND free_track_level > 10
        `;
        
        const avgResult = await postgres.query(avgSql, [seasonId]);
        const avgLevel = parseFloat(avgResult.rows[0]?.avg_level) || 1;
        
        // Determine eligibility
        const isEligible = bp.free_track_level < (avgLevel * 0.7); // Below 70% of average
        
        res.json({
            success: true,
            catchUp: {
                eligible: isEligible,
                user_level: bp.free_track_level,
                average_level: Math.round(avgLevel),
                mechanics: mechanicsResult.rows,
                bonusMultiplier: isEligible ? 1.5 : 1.0 // 50% bonus if behind
            }
        });
    } catch (error) {
        console.error('Get catch-up status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch catch-up status'
        });
    }
});

/**
 * @route GET /api/v1/acceleration/my-boosters
 * @desc Get user's owned boosters
 */
router.get('/my-boosters', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const sql = `
            SELECT 
                uxb.*,
                xb.name,
                xb.description,
                xb.booster_type,
                xb.boost_value,
                xb.duration_minutes
            FROM user_xp_boosters uxb
            JOIN xp_boosters xb ON uxb.booster_id = xb.id
            WHERE uxb.user_id = $1 AND uxb.quantity > 0
            ORDER BY uxb.is_active DESC, xb.name
        `;
        
        const result = await postgres.query(sql, [userId]);
        
        res.json({
            success: true,
            boosters: result.rows
        });
    } catch (error) {
        console.error('Get my boosters error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch boosters'
        });
    }
});

module.exports = router;
