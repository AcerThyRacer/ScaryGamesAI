/**
 * Referral API Routes
 * Handles referral system endpoints
 */

const express = require('express');
const router = express.Router();
const db = require('../models/database');
const postgres = require('../models/postgres');
const authMiddleware = require('../middleware/auth');
const { requireMonetizationAuth } = require('../middleware/auth');
const { executeIdempotentMutation, appendAuditEvent, makeId } = require('../services/economyMutationService');

/**
 * @route GET /api/referrals/my-code
 * @desc Get user's referral code
 */
router.get('/my-code', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        let referral = db.findOne('referrals', { referrerId: userId, isMasterCode: true });
        
        if (!referral) {
            // Generate new code
            const code = `SUMMON-${req.user.username?.substr(0, 6).toUpperCase() || 'USER'}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            referral = db.create('referrals', {
                referrerId: userId,
                code,
                isMasterCode: true,
                used: false,
                createdAt: new Date().toISOString()
            });
        }

        const stats = await db.getReferralStats(userId);
        
        res.json({
            code: referral.code,
            link: `${process.env.DOMAIN}/subscription?ref=${referral.code}`,
            stats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /api/referrals/stats
 * @desc Get detailed referral statistics
 */
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const stats = await db.getReferralStats(userId);
        
        // Get individual referrals
        const referrals = db.find('referrals', { referrerId: userId })
            .filter(r => !r.isMasterCode)
            .map(r => ({
                email: r.referredEmail,
                status: r.converted ? 'converted' : 'pending',
                date: r.createdAt,
                reward: r.rewardValue || 0
            }));

        // Calculate next reward
        const nextMilestone = getNextMilestone(stats.converted);

        res.json({
            ...stats,
            referrals,
            nextMilestone
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route POST /api/referrals/track-click
 * @desc Track referral link click
 */
router.post('/track-click', async (req, res) => {
    try {
        const { code } = req.body;
        
        const referral = db.findOne('referrals', { code });
        if (!referral) {
            return res.status(404).json({ error: 'Invalid referral code' });
        }

        // Update click stats
        db.update('referrals', referral.id, {
            clicks: (referral.clicks || 0) + 1
        });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /api/referrals/leaderboard
 * @desc Get top referrers
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const allReferrals = db.findAll('referrals');
        
        // Group by referrer
        const referrerStats = {};
        allReferrals.forEach(r => {
            if (!referrerStats[r.referrerId]) {
                referrerStats[r.referrerId] = { total: 0, converted: 0 };
            }
            referrerStats[r.referrerId].total++;
            if (r.converted) {
                referrerStats[r.referrerId].converted++;
            }
        });

        // Get user details and sort
        const leaderboard = Object.entries(referrerStats)
            .map(([userId, stats]) => {
                const user = db.findById('users', userId);
                return {
                    username: user?.username || 'Unknown',
                    avatar: user?.avatar || '👤',
                    total: stats.total,
                    converted: stats.converted,
                    cultTitle: stats.converted >= 10 ? 'High Priest' : 
                               stats.converted >= 5 ? 'Cult Leader' : 
                               stats.converted >= 1 ? 'Summoner' : 'Acolyte'
                };
            })
            .sort((a, b) => b.converted - a.converted)
            .slice(0, 20);

        res.json(leaderboard);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route POST /api/referrals/hooks/qualified-bonus
 * @desc Enhancement hook: grants qualified referral bonus for post-conversion actions
 */
router.post('/hooks/qualified-bonus', requireMonetizationAuth, async (req, res) => {
    if (!postgres.isEnabled()) {
        return res.status(503).json({
            success: false,
            error: {
                code: 'PG_REQUIRED',
                message: 'This endpoint requires PostgreSQL-backed economy mode'
            }
        });
    }

    const idempotencyKey = req.header('idempotency-key')
        || req.header('x-idempotency-key')
        || req.body?.idempotencyKey;

    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
        return res.status(400).json({
            success: false,
            error: {
                code: 'IDEMPOTENCY_KEY_REQUIRED',
                message: 'idempotency-key header is required'
            }
        });
    }

    const referredUserId = typeof req.body?.referredUserId === 'string' ? req.body.referredUserId.trim() : '';
    const triggerType = typeof req.body?.triggerType === 'string' ? req.body.triggerType.trim() : '';

    const allowedTriggers = new Set(['first_store_purchase', 'first_marketplace_sale', 'first_subscription']);
    if (!referredUserId) {
        return res.status(400).json({
            success: false,
            error: { code: 'INVALID_REFERRED_USER', message: 'referredUserId is required' }
        });
    }

    if (!triggerType || !allowedTriggers.has(triggerType)) {
        return res.status(400).json({
            success: false,
            error: { code: 'INVALID_TRIGGER_TYPE', message: 'triggerType is invalid' }
        });
    }

    try {
        const mutation = await executeIdempotentMutation({
            scope: 'referrals.hooks.qualified_bonus',
            idempotencyKey,
            requestPayload: { actorUserId: req.user.id, referredUserId, triggerType },
            actorUserId: req.user.id,
            targetUserId: referredUserId,
            entityType: 'referral_bonus_event',
            eventType: 'referral_bonus_qualified',
            requestId: req.header('x-request-id') || null,
            mutationFn: async () => {
                const referralCodeResult = await postgres.query(
                    `
                      SELECT referrer_id
                      FROM referrals
                      WHERE converted_user_id = $1
                        AND converted = TRUE
                      ORDER BY converted_at DESC NULLS LAST, created_at DESC
                      LIMIT 1
                    `,
                    [referredUserId]
                );

                const record = referralCodeResult.rows[0];
                if (!record?.referrer_id) {
                    const err = new Error('No converted referral relationship found for referred user');
                    err.code = 'REFERRAL_RELATIONSHIP_NOT_FOUND';
                    throw err;
                }

                const referrerUserId = record.referrer_id;
                if (req.user.id !== referredUserId) {
                    const err = new Error('Caller must match referred user');
                    err.code = 'REFERRED_USER_AUTH_REQUIRED';
                    throw err;
                }
                if (referrerUserId === referredUserId) {
                    const err = new Error('Self-referrals are not eligible for bonus');
                    err.code = 'SELF_REFERRAL_FORBIDDEN';
                    throw err;
                }

                const referredAccount = await postgres.query(
                    `
                      SELECT id, created_at
                      FROM users
                      WHERE id = $1
                      LIMIT 1
                    `,
                    [referredUserId]
                );
                const referredCreatedAt = referredAccount.rows[0]?.created_at ? new Date(referredAccount.rows[0].created_at) : null;
                if (!referredCreatedAt || Number.isNaN(referredCreatedAt.getTime())) {
                    const err = new Error('Referred user account not found');
                    err.code = 'REFERRED_USER_NOT_FOUND';
                    throw err;
                }
                if ((Date.now() - referredCreatedAt.getTime()) < 24 * 60 * 60 * 1000) {
                    const err = new Error('Referred account must be at least 24h old for qualified bonus');
                    err.code = 'REFERRED_ACCOUNT_TOO_NEW';
                    throw err;
                }

                const existingTriggerAward = await postgres.query(
                    `
                      SELECT id
                      FROM referral_bonus_events
                      WHERE referred_user_id = $1
                        AND trigger_type = $2
                        AND status = 'qualified'
                      ORDER BY created_at DESC
                      LIMIT 1
                    `,
                    [referredUserId, triggerType]
                );
                if (existingTriggerAward.rows.length > 0) {
                    const err = new Error('Qualified bonus already granted for this trigger');
                    err.code = 'REFERRAL_TRIGGER_ALREADY_REWARDED';
                    throw err;
                }

                const bonusAmount = triggerType === 'first_subscription' ? 300 : 150;

                const recentBonusCount = await postgres.query(
                    `
                      SELECT COUNT(1)::int AS c
                      FROM referral_bonus_events
                      WHERE referrer_user_id = $1
                        AND created_at >= NOW() - INTERVAL '1 day'
                    `,
                    [referrerUserId]
                );

                if ((recentBonusCount.rows[0]?.c || 0) >= 50) {
                    const err = new Error('Referral bonus daily cap reached for referrer');
                    err.code = 'REFERRAL_DAILY_CAP_REACHED';
                    throw err;
                }

                await postgres.query('BEGIN');
                try {
                    const referrerResult = await postgres.query(
                        'SELECT id, horror_coins FROM users WHERE id = $1 LIMIT 1 FOR UPDATE',
                        [referrerUserId]
                    );

                    const referrer = referrerResult.rows[0];
                    if (!referrer) {
                        const err = new Error('Referrer not found');
                        err.code = 'REFERRER_NOT_FOUND';
                        throw err;
                    }

                    const eventId = makeId('rbe');
                    await postgres.query(
                        `
                          INSERT INTO referral_bonus_events (
                            id, referrer_user_id, referred_user_id, trigger_type, bonus_amount,
                            status, idempotency_key, metadata, created_at, processed_at
                          )
                          VALUES ($1, $2, $3, $4, $5, 'qualified', $6, '{}'::jsonb, NOW(), NOW())
                        `,
                        [eventId, referrerUserId, referredUserId, triggerType, bonusAmount, idempotencyKey]
                    );

                    const newCoins = Number(referrer.horror_coins || 0) + bonusAmount;
                    await postgres.query(
                        'UPDATE users SET horror_coins = $2, updated_at = NOW() WHERE id = $1',
                        [referrerUserId, newCoins]
                    );

                    await appendAuditEvent({
                        actorUserId: req.user.id,
                        targetUserId: referrerUserId,
                        entityType: 'currency',
                        entityId: referrerUserId,
                        eventType: 'currency.credit',
                        requestId: req.header('x-request-id') || null,
                        idempotencyKey,
                        metadata: {
                            reason: 'referral_qualified_bonus',
                            triggerType,
                            referredUserId,
                            amount: bonusAmount
                        }
                    });

                    await postgres.query('COMMIT');

                    return {
                        success: true,
                        eventId,
                        referrerUserId,
                        referredUserId,
                        triggerType,
                        bonusAmount,
                        resourceType: 'referral_bonus_event',
                        resourceId: eventId
                    };
                } catch (error) {
                    await postgres.query('ROLLBACK');
                    throw error;
                }
            }
        });

        return res.status(mutation.replayed ? 200 : 201).json({
            success: true,
            ...mutation.responseBody,
            replayed: mutation.replayed
        });
    } catch (error) {
        if (error.code === 'IDEMPOTENCY_PAYLOAD_MISMATCH') {
            return res.status(409).json({
                success: false,
                error: {
                    code: error.code,
                    message: 'Idempotency key already used with different payload'
                }
            });
        }

        if (error.code === 'IDEMPOTENCY_IN_PROGRESS') {
            return res.status(409).json({
                success: false,
                error: {
                    code: error.code,
                    message: 'Request with this idempotency key is currently in progress'
                }
            });
        }

        const statusByCode = {
            REFERRAL_RELATIONSHIP_NOT_FOUND: 404,
            REFERRAL_DAILY_CAP_REACHED: 429,
            REFERRER_NOT_FOUND: 404,
            REFERRED_USER_NOT_FOUND: 404,
            REFERRED_USER_AUTH_REQUIRED: 403,
            SELF_REFERRAL_FORBIDDEN: 400,
            REFERRED_ACCOUNT_TOO_NEW: 429,
            REFERRAL_TRIGGER_ALREADY_REWARDED: 409
        };

        return res.status(statusByCode[error.code] || 400).json({
            success: false,
            error: {
                code: error.code || 'REFERRAL_BONUS_HOOK_FAILED',
                message: error.message
            }
        });
    }
});

function getNextMilestone(converted) {
    const milestones = [
        { count: 1, reward: '1 Week Free' },
        { count: 3, reward: 'Exclusive Skin Pack' },
        { count: 5, reward: '1 Month Free + Cult Leader Badge' },
        { count: 10, reward: 'Permanent 20% Discount' }
    ];

    return milestones.find(m => m.count > converted) || null;
}

module.exports = router;
