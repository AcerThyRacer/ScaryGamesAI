/**
 * Mobile Companion API - Phase 4
 * Idle earnings, offline progress, mobile challenges, push notifications
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireMonetizationAuth } = require('../middleware/auth');
const postgres = require('../models/postgres');
const { executeIdempotentMutation } = require('../services/economyMutationService');

function generateId(prefix = 'mob') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * @route POST /api/v1/mobile/register-device
 * @desc Register mobile device for push notifications
 */
router.post('/register-device', authMiddleware, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({ success: false, error: 'idempotency-key required' });
    }
    
    try {
        const userId = req.user.id;
        const { device_id, device_type, push_token, app_version, os_version } = req.body;
        
        const mutation = await executeIdempotentMutation({
            scope: 'mobile.register_device',
            idempotencyKey,
            requestPayload: { userId, device_id, device_type, push_token },
            actorUserId: userId,
            entityType: 'mobile_device',
            eventType: 'register',
            mutationFn: async () => {
                const deviceId = generateId('dev');
                
                await postgres.query(
                    `INSERT INTO mobile_devices (
                        id, user_id, device_id, device_type, push_token, app_version, os_version, last_active_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
                    ON CONFLICT (user_id, device_id)
                    DO UPDATE SET 
                        push_token = $5,
                        app_version = $6,
                        os_version = $7,
                        last_active_at = NOW()`,
                    [deviceId, userId, device_id, device_type, push_token, app_version, os_version]
                );
                
                return {
                    success: true,
                    device: {
                        device_id,
                        device_type,
                        registered: true
                    }
                };
            }
        });
        
        res.status(201).json(mutation);
    } catch (error) {
        console.error('Register device error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to register device'
        });
    }
});

/**
 * @route GET /api/v1/mobile/idle-earnings
 * @desc Calculate and get idle earnings
 */
router.get('/idle-earnings', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Get user's last calculation time
        let earnings = await postgres.query(
            'SELECT * FROM user_idle_earnings WHERE user_id = $1',
            [userId]
        );
        
        // Get idle earning rates
        const rates = await postgres.query(
            'SELECT * FROM idle_earning_rates WHERE is_active = TRUE'
        );
        
        // Calculate hours since last claim
        const now = new Date();
        let totalHours = 24; // Default if no previous claim
        
        if (earnings.rows.length > 0 && earnings.rows[0].last_calculated_at) {
            const lastCalc = new Date(earnings.rows[0].last_calculated_at);
            totalHours = (now - lastCalc) / (1000 * 60 * 60); // Hours
        }
        
        const calculatedEarnings = [];
        
        for (const rate of rates.rows) {
            const earningType = rate.earning_type;
            const ratePerHour = parseFloat(rate.base_rate_per_hour);
            const maxHours = parseInt(rate.max_accumulation_hours);
            
            // Apply caps
            const applicableHours = Math.min(totalHours, maxHours);
            const amount = ratePerHour * applicableHours;
            
            calculatedEarnings.push({
                earning_type: earningType,
                rate_per_hour: ratePerHour,
                hours_accumulated: applicableHours,
                amount_available: amount,
                max_accumulation: maxHours
            });
        }
        
        res.json({
            success: true,
            earnings: calculatedEarnings,
            hours_since_claim: totalHours
        });
    } catch (error) {
        console.error('Get idle earnings error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate idle earnings'
        });
    }
});

/**
 * @route POST /api/v1/mobile/claim-idle-earnings
 * @desc Claim accumulated idle earnings
 */
router.post('/claim-idle-earnings', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({ success: false, error: 'idempotency-key required' });
    }
    
    try {
        const userId = req.user.id;
        
        const mutation = await executeIdempotentMutation({
            scope: 'mobile.claim_idle',
            idempotencyKey,
            requestPayload: { userId },
            actorUserId: userId,
            entityType: 'idle_earnings',
            eventType: 'claim',
            mutationFn: async () => {
                await postgres.query('BEGIN');
                
                try {
                    const rates = await postgres.query('SELECT * FROM idle_earning_rates WHERE is_active = TRUE');
                    const now = new Date();
                    let totalClaimed = 0;
                    
                    for (const rate of rates.rows) {
                        // Get or create user idle earnings record
                        let userEarning = await postgres.query(
                            'SELECT * FROM user_idle_earnings WHERE user_id = $1 AND earning_type = $2',
                            [userId, rate.earning_type]
                        );
                        
                        let hoursAccumulated = 0;
                        let lastClaimed = now;
                        
                        if (userEarning.rows.length > 0) {
                            const lastCalc = new Date(userEarning.rows[0].last_calculated_at);
                            hoursAccumulated = (now - lastCalc) / (1000 * 60 * 60);
                            hoursAccumulated = Math.min(hoursAccumulated, parseInt(rate.max_accumulation_hours));
                            lastClaimed = new Date(userEarning.rows[0].last_claimed_at) || now;
                        } else {
                            // Initialize record
                            const earningId = generateId('idle');
                            await postgres.query(
                                `INSERT INTO user_idle_earnings (id, user_id, earning_type, accumulated_amount, hours_accumulated, last_calculated_at)
                                 VALUES ($1, $2, $3, 0, 0, NOW())`,
                                [earningId, userId, rate.earning_type]
                            );
                        }
                        
                        const amount = parseFloat(rate.base_rate_per_hour) * hoursAccumulated;
                        
                        if (amount > 0) {
                            // Grant coins
                            if (rate.earning_type.includes('coins')) {
                                await postgres.query(
                                    'UPDATE users SET horror_coins = horror_coins + $2 WHERE id = $1',
                                    [userId, amount]
                                );
                            } else {
                                await postgres.query(
                                    'UPDATE users SET account_credit = account_credit + $2 WHERE id = $1',
                                    [userId, amount]
                                );
                            }
                            
                            totalClaimed += amount;
                            
                            // Update record
                            await postgres.query(
                                `UPDATE user_idle_earnings 
                                 SET accumulated_amount = accumulated_amount + $3,
                                     hours_accumulated = 0,
                                     last_claimed_at = $4,
                                     last_calculated_at = NOW()
                                 WHERE user_id = $1 AND earning_type = $2`,
                                [userId, rate.earning_type, amount, now]
                            );
                        }
                    }
                    
                    await postgres.query('COMMIT');
                    
                    return {
                        success: true,
                        claimed: {
                            total_amount: totalClaimed,
                            claimed_at: now
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
        console.error('Claim idle earnings error:', error);
        res.status(500).json({
            success: false,
            error: error.code || 'CLAIM_FAILED',
            message: error.message || 'Failed to claim idle earnings'
        });
    }
});

/**
 * @route GET /api/v1/mobile/challenges
 * @desc Get mobile-exclusive challenges
 */
router.get('/challenges', authMiddleware, async (req, res) => {
    try {
        const sql = `
            SELECT 
                mc.*,
                umc.progress,
                umc.is_completed,
                umc.reward_claimed,
                umc.completions
            FROM mobile_challenges mc
            LEFT JOIN user_mobile_challenges umc ON mc.id = umc.challenge_id AND umc.user_id = $1
            WHERE mc.is_active = TRUE
            AND mc.expires_at > NOW()
            ORDER BY mc.challenge_type, mc.expires_at
        `;
        
        const result = await postgres.query(sql, [req.user.id]);
        
        res.json({
            success: true,
            challenges: result.rows
        });
    } catch (error) {
        console.error('Get mobile challenges error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch mobile challenges'
        });
    }
});

/**
 * @route POST /api/v1/mobile/offline-progress
 * @desc Calculate offline progress
 */
router.post('/offline-progress', authMiddleware, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({ success: false, error: 'idempotency-key required' });
    }
    
    try {
        const userId = req.user.id;
        const { last_active_at } = req.body;
        
        const mutation = await executeIdempotentMutation({
            scope: 'mobile.offline_progress',
            idempotencyKey,
            requestPayload: { userId, last_active_at },
            actorUserId: userId,
            entityType: 'offline_progress',
            eventType: 'calculate',
            mutationFn: async () => {
                const now = new Date();
                const lastActive = new Date(last_active_at);
                const offlineSeconds = (now - lastActive) / 1000;
                const offlineHours = offlineSeconds / 3600;
                
                // Calculate offline earnings (simplified - 50% of idle rate)
                const offlineEarnings = Math.floor(offlineHours * 25); // 25 coins per hour offline
                
                // Create offline progress record
                const progressId = generateId('offline');
                await postgres.query(
                    `INSERT INTO offline_progress (
                        id, user_id, progress_type, progress_data, started_at, expires_at
                    ) VALUES ($1, $2, $3, $4, NOW(), NOW() + INTERVAL '7 days')`,
                    [
                        progressId,
                        userId,
                        'idle_earning',
                        JSON.stringify({
                            offline_hours: offlineHours,
                            coins_earned: offlineEarnings,
                            start_time: lastActive.toISOString(),
                            end_time: now.toISOString()
                        }),
                    ]
                );
                
                return {
                    success: true,
                    offlineProgress: {
                        hours_offline: offlineHours,
                        coins_earned: offlineEarnings,
                        progress_id: progressId
                    }
                };
            }
        });
        
        res.status(200).json(mutation);
    } catch (error) {
        console.error('Calculate offline progress error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to calculate offline progress'
        });
    }
});

/**
 * @route POST /api/v1/mobile/sync
 * @desc Cross-platform sync
 */
router.post('/sync', authMiddleware, async (req, res) => {
    const idempotencyKey = req.header('idempotency-key') || req.body?.idempotencyKey;
    if (!idempotencyKey) {
        return res.status(400).json({ success: false, error: 'idempotency-key required' });
    }
    
    try {
        const userId = req.user.id;
        const { platform, sync_data, device_info } = req.body;
        
        const mutation = await executeIdempotentMutation({
            scope: 'mobile.sync',
            idempotencyKey,
            requestPayload: { userId, platform, sync_data },
            actorUserId: userId,
            entityType: 'cross_platform_sync',
            eventType: 'sync',
            mutationFn: async () => {
                const now = new Date();
                
                await postgres.query(
                    `INSERT INTO cross_platform_sync (user_id, platform, last_sync_at, sync_data, device_info)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (user_id, platform)
                     DO UPDATE SET 
                        last_sync_at = $3,
                        sync_data = $4,
                        device_info = $5`,
                    [userId, platform, now, JSON.stringify(sync_data), JSON.stringify(device_info || {})]
                );
                
                return {
                    success: true,
                    synced: {
                        platform,
                        synced_at: now
                    }
                };
            }
        });
        
        res.status(200).json(mutation);
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to sync'
        });
    }
});

/**
 * @route GET /api/v1/mobile/social-feed
 * @desc Get user's social feed
 */
router.get('/social-feed', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20 } = req.query;
        
        const sql = `
            SELECT 
                sfa.*,
                u.username,
                u.avatar,
                usf.is_read,
                usf.is_liked
            FROM social_feed_activities sfa
            JOIN users u ON sfa.user_id = u.id
            LEFT JOIN user_social_feed usf ON sfa.id = usf.activity_id AND usf.user_id = $1
            WHERE sfa.visibility = 'public' OR sfa.user_id = $1
            ORDER BY sfa.created_at DESC
            LIMIT $2
        `;
        
        const result = await postgres.query(sql, [userId, parseInt(limit)]);
        
        res.json({
            success: true,
            feed: result.rows
        });
    } catch (error) {
        console.error('Get social feed error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch social feed'
        });
    }
});

module.exports = router;
