/**
 * Subscription API Routes
 * Handles all subscription-related endpoints
 */

const express = require('express');
const router = express.Router();
const paymentService = require('../services/paymentService');
const battlePassService = require('../services/battlePassService');
const aiService = require('../services/aiService');
const battlePassServiceV2 = require('../services/battlePassServiceV2');
const db = require('../models/database');
const dataAccess = require('../models/data-access');
const cacheService = require('../services/cacheService');
const postgres = require('../models/postgres');
const pool = require('../models/postgres').pool;
const { executeIdempotentMutation, appendAuditEvent, makeId } = require('../services/economyMutationService');

// Middleware
const authMiddleware = require('../middleware/auth');
const { requireMonetizationAuth } = require('../middleware/auth');

const BATTLE_PASS_GIFT_TIER_GEM_COST = 10;

/**
 * @route POST /api/subscriptions/create-checkout
 * @desc Create a checkout session for subscription
 */
router.post('/create-checkout', requireMonetizationAuth, async (req, res) => {
    try {
        const { tier, billingCycle, referralCode } = req.body;
        const userId = req.user.id;

        const session = await paymentService.createCheckoutSession(
            userId, 
            tier, 
            billingCycle, 
            referralCode
        );

        res.json({ 
            success: true, 
            sessionId: session.id,
            url: session.url
        });
    } catch (error) {
        console.error('Checkout creation error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

/**
 * @route GET /api/subscriptions/status
 * @desc Get current user's subscription status
 */
router.get('/status', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const subscription = await db.getActiveSubscription(userId);
        
        if (!subscription) {
            return res.json({ 
                hasSubscription: false,
                tier: null
            });
        }

        // Calculate time remaining
        const expiresAt = new Date(subscription.expiresAt);
        const daysRemaining = Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24));

        res.json({
            hasSubscription: true,
            tier: subscription.tier,
            billingCycle: subscription.billingCycle,
            startedAt: subscription.startedAt,
            expiresAt: subscription.expiresAt,
            daysRemaining,
            streakDays: subscription.streakDays,
            totalDays: subscription.totalDays,
            autoRenew: subscription.status === 'active'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route POST /api/subscriptions/cancel
 * @desc Cancel active subscription
 */
router.post('/cancel', requireMonetizationAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await paymentService.cancelSubscription(userId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route POST /api/subscriptions/change-tier
 * @desc Upgrade or downgrade subscription tier
 */
router.post('/change-tier', requireMonetizationAuth, async (req, res) => {
    try {
        const { newTier } = req.body;
        const userId = req.user.id;
        
        const result = await paymentService.changeTier(userId, newTier);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /api/subscriptions/battle-pass
 * @desc Get user's battle pass data
 */
router.get('/battle-pass', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const battlePass = await battlePassService.getUserBattlePass(userId);
        res.json(battlePass);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route POST /api/subscriptions/claim-reward
 * @desc Claim a battle pass reward
 */
router.post('/claim-reward', authMiddleware, async (req, res) => {
    try {
        const { level } = req.body;
        const userId = req.user.id;
        
        const result = await battlePassService.claimReward(userId, level);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @route POST /api/subscriptions/daily-login
 * @desc Claim daily login reward
 */
router.post('/daily-login', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const status = await battlePassService.getDailyLoginStatus(userId);
        
        if (!status.canClaim) {
            return res.status(400).json({ 
                error: 'Already claimed today',
                nextClaim: 'Tomorrow'
            });
        }

        const result = await battlePassService.awardXP(userId, 'DAILY_LOGIN', {
            streak: status.currentStreak
        });

        res.json({
            success: true,
            xpGained: result.xpGained,
            streak: status.currentStreak + 1,
            nextMilestone: status.nextMilestone
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /api/subscriptions/leaderboard
 * @desc Get subscription leaderboard
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const parsed = parseInt(req.query.limit, 10);
        const limit = Number.isFinite(parsed) ? Math.max(1, Math.min(parsed, 500)) : 100;

        const cacheKey = `leaderboard:subscriptions:${limit}`;
        const cached = await cacheService.getJson(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const leaderboard = await dataAccess.getSubscriptionLeaderboard(limit);
        await cacheService.setJson(cacheKey, leaderboard, 30);

        res.json(leaderboard);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /api/subscriptions/profile
 * @desc Get AI-generated horror profile
 */
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const profile = await aiService.generateHorrorProfile(userId);
        res.json(profile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /api/subscriptions/dashboard
 * @desc Get personalized dashboard
 */
router.get('/dashboard', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const dashboard = await aiService.getPersonalizedDashboard(userId);
        res.json(dashboard);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /api/subscriptions/community-goals
 * @desc Get community milestone goals
 */
router.get('/community-goals', async (req, res) => {
    try {
        const cacheKey = 'community-goals:v1';
        const cached = await cacheService.getJson(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const goals = await db.getCommunityGoals();
        await cacheService.setJson(cacheKey, goals, 60);

        res.json(goals);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route GET /api/subscriptions/pricing
 * @desc Get pricing with personalized discounts
 */
router.get('/pricing', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const discount = await paymentService.getPersonalizedDiscount(userId);
        
        const basePrices = {
            survivor: { monthly: 2, annual: 20 },
            hunter: { monthly: 5, annual: 50 },
            elder: { monthly: 8, annual: 80 }
        };

        // Apply discount
        const prices = {};
        Object.entries(basePrices).forEach(([tier, cycles]) => {
            prices[tier] = {
                monthly: cycles.monthly * (1 - discount / 100),
                annual: cycles.annual * (1 - discount / 100),
                originalMonthly: cycles.monthly,
                originalAnnual: cycles.annual
            };
        });

        res.json({
            prices,
            discount,
            discountReason: discount > 0 ? 'Personalized offer based on your engagement' : null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Validate payment input middleware
 */
const validatePaymentInput = (req, res, next) => {
    const { tier, billingCycle, amount } = req.body;

    const validTiers = new Set(['survivor', 'hunter', 'elder']);
    const validCycles = new Set(['monthly', 'annual']);

    if (tier && !validTiers.has(tier)) {
        return res.status(400).json({
            success: false,
            error: { code: 'INVALID_TIER', message: 'Invalid subscription tier' }
        });
    }

    if (billingCycle && !validCycles.has(billingCycle)) {
        return res.status(400).json({
            success: false,
            error: { code: 'INVALID_BILLING_CYCLE', message: 'Invalid billing cycle' }
        });
    }

    if (amount && (typeof amount !== 'number' || amount <= 0)) {
        return res.status(400).json({
            success: false,
            error: { code: 'INVALID_AMOUNT', message: 'Invalid amount' }
        });
    }

    next();
};

/**
 * @route POST /api/subscriptions/gift
 * @desc Gift a subscription to a friend
 */
router.post('/gift', requireMonetizationAuth, validatePaymentInput, async (req, res) => {
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

    const recipientUserId = typeof req.body?.recipientUserId === 'string' ? req.body.recipientUserId.trim() : '';
    const tier = typeof req.body?.tier === 'string' ? req.body.tier.trim() : '';
    const billingCycle = typeof req.body?.billingCycle === 'string' ? req.body.billingCycle.trim() : '';
    const message = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 240) : null;

    if (!recipientUserId) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_RECIPIENT', message: 'recipientUserId is required' } });
    }

    if (recipientUserId === req.user.id) {
        return res.status(400).json({ success: false, error: { code: 'SELF_GIFT_FORBIDDEN', message: 'Cannot gift to yourself' } });
    }

    try {
        // Check for duplicate transactions
        if (postgres.isEnabled()) {
            const existingTransaction = await postgres.query(
                `SELECT id FROM gift_transactions
                 WHERE idempotency_key = $1 LIMIT 1`,
                [idempotencyKey]
            );

            if (existingTransaction.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    error: {
                        code: 'DUPLICATE_TRANSACTION',
                        message: 'Transaction already processed'
                    }
                });
            }
        }

        const mutation = await executeIdempotentMutation({
            scope: 'subscriptions.gift',
            idempotencyKey,
            requestPayload: {
                senderUserId: req.user.id,
                recipientUserId,
                tier,
                billingCycle,
                message
            },
            actorUserId: req.user.id,
            targetUserId: recipientUserId,
            entityType: 'subscription',
            eventType: 'subscription_gift',
            requestId: req.header('x-request-id') || null,
            mutationFn: async () => {
                const client = await pool.connect();
                try {
                    await client.query('BEGIN');

                    if (postgres.isEnabled()) {
                        // Minimal anti-abuse guard: cap daily gifts from one sender.
                        const daily = await client.query(
                            `
                              SELECT COUNT(1)::int AS c
                              FROM gift_transactions
                              WHERE sender_user_id = $1
                                AND gift_type = 'subscription'
                                AND created_at >= NOW() - INTERVAL '1 day'
                            `,
                            [req.user.id]
                        );

                        if ((daily.rows[0]?.c || 0) >= 5) {
                            const err = new Error('Daily subscription gift cap reached');
                            err.code = 'DAILY_SUBSCRIPTION_GIFT_CAP_REACHED';
                            throw err;
                        }

                        // Require friendship in PG mode.
                        const friendship = await client.query(
                            `
                              SELECT 1
                              FROM user_friendships
                              WHERE status = 'accepted'
                                AND ((user_id = $1 AND friend_user_id = $2) OR (user_id = $2 AND friend_user_id = $1))
                              LIMIT 1
                            `,
                            [req.user.id, recipientUserId]
                        );

                        if (friendship.rows.length === 0) {
                            const err = new Error('Recipient must be a friend');
                            err.code = 'FRIENDSHIP_REQUIRED';
                            throw err;
                        }
                    }

                    const result = await paymentService.giftSubscription({
                        senderUserId: req.user.id,
                        recipientUserId,
                        tier,
                        billingCycle,
                        message,
                        idempotencyKey,
                        requestId: req.header('x-request-id') || null
                    });

                    await client.query('COMMIT');
                    return {
                        ...result,
                        resourceType: 'subscription_gift',
                        resourceId: result.giftId
                    };
                } catch (error) {
                    await client.query('ROLLBACK');
                    console.error('[PaymentService] Transaction failed:', error);
                    throw error;
                } finally {
                    client.release();
                }
            }
        });

        return res.status(mutation.replayed ? 200 : 201).json({
            success: true,
            ...mutation.responseBody,
            replayed: mutation.replayed
        });
    } catch (error) {
        console.error('[PaymentService] Critical error:', error);

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
            DAILY_SUBSCRIPTION_GIFT_CAP_REACHED: 429,
            FRIENDSHIP_REQUIRED: 403,
            RECIPIENT_NOT_FOUND: 404,
            SELF_GIFT_FORBIDDEN: 400,
            INVALID_TIER: 400,
            INVALID_BILLING_CYCLE: 400,
            DUPLICATE_TRANSACTION: 409
        };

        return res.status(statusByCode[error.code] || 500).json({
            success: false,
            error: {
                code: error.code || 'INTERNAL_ERROR',
                message: error.message || 'Payment processing failed'
            }
        });
    }
});

function readIdempotencyKey(req) {
    return req.header('idempotency-key')
        || req.header('x-idempotency-key')
        || req.body?.idempotencyKey;
}

async function ensureFriends(userId, friendUserId) {
    const result = await postgres.query(
        `
          SELECT 1
          FROM user_friendships
          WHERE status = 'accepted'
            AND ((user_id = $1 AND friend_user_id = $2) OR (user_id = $2 AND friend_user_id = $1))
          LIMIT 1
        `,
        [userId, friendUserId]
    );

    return result.rows.length > 0;
}

function bpErrorStatus(errorCode) {
    const map = {
        IDEMPOTENCY_PAYLOAD_MISMATCH: 409,
        IDEMPOTENCY_IN_PROGRESS: 409,
        BP_V2_REQUIRES_POSTGRES: 503,
        NO_ACTIVE_SEASON: 404,
        SEASON_NOT_FOUND: 404,
        INVALID_EVENT_TYPE: 400,
        INVALID_EVENTVALUE: 400,
        INVALID_OCCURRED_AT: 400,
        EVENT_TIME_IN_FUTURE: 400,
        INVALID_TIERNUMBER: 400,
        INVALID_FROMTIER: 400,
        INVALID_TOTIER: 400,
        INVALID_XPAMOUNT: 400,
        TIER_NOT_REACHED: 409,
        DUPLICATE_CLAIM: 409,
        REWARD_NOT_CONFIGURED: 404,
        INVALID_TEAM_NAME: 400,
        INVALID_TEAM_ID: 400,
        ALREADY_IN_TEAM: 409,
        TEAM_NOT_FOUND: 404,
        TEAM_MEMBERSHIP_REQUIRED: 403,
        DAILY_TEAM_CONTRIBUTION_CAP_REACHED: 429,
        INVALID_RECIPIENT: 400,
        SELF_GIFT_FORBIDDEN: 400,
        INVALID_TIER_COUNT: 400,
        FRIENDSHIP_REQUIRED: 403,
        SENDER_NOT_FOUND: 404,
        RECIPIENT_NOT_FOUND: 404,
        INSUFFICIENT_GEMS: 409
    };

    return map[errorCode] || 400;
}

function bpErrorCode(error) {
    if (error?.code) return error.code;
    return 'BATTLE_PASS_V2_ERROR';
}

/**
 * @route GET /api/subscriptions/battle-pass/v2
 * @desc Get season-aware battle pass v2 state
 */
router.get('/battle-pass/v2', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const seasonKey = typeof req.query?.seasonKey === 'string' ? req.query.seasonKey.trim() : null;
        const result = await battlePassServiceV2.getBattlePassState(userId, { seasonKey });
        return res.json({ success: true, ...result });
    } catch (error) {
        return res.status(bpErrorStatus(error.code)).json({
            success: false,
            error: {
                code: bpErrorCode(error),
                message: error.message
            }
        });
    }
});

/**
 * @route POST /api/subscriptions/battle-pass/v2/events
 * @desc Ingest quest progress event (idempotent)
 */
router.post('/battle-pass/v2/events', authMiddleware, async (req, res) => {
    const idempotencyKey = readIdempotencyKey(req);
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
        return res.status(400).json({
            success: false,
            error: {
                code: 'IDEMPOTENCY_KEY_REQUIRED',
                message: 'idempotency-key header is required'
            }
        });
    }

    const eventType = typeof req.body?.eventType === 'string' ? req.body.eventType.trim() : '';
    const seasonKey = typeof req.body?.seasonKey === 'string' ? req.body.seasonKey.trim() : null;
    const eventValue = Number.isFinite(parseInt(req.body?.eventValue, 10)) ? parseInt(req.body.eventValue, 10) : 1;
    const source = typeof req.body?.source === 'string' ? req.body.source.trim() : null;
    const occurredAt = typeof req.body?.occurredAt === 'string' ? req.body.occurredAt.trim() : null;
    const metadata = (req.body?.metadata && typeof req.body.metadata === 'object') ? req.body.metadata : {};

    try {
        const mutation = await executeIdempotentMutation({
            scope: 'battlepass.v2.events',
            idempotencyKey,
            requestPayload: {
                userId: req.user.id,
                eventType,
                eventValue,
                seasonKey,
                source,
                occurredAt,
                metadata
            },
            actorUserId: req.user.id,
            targetUserId: req.user.id,
            entityType: 'battle_pass_event',
            eventType: 'battle_pass.v2.event_ingest',
            requestId: req.header('x-request-id') || null,
            mutationFn: async () => {
                const result = await battlePassServiceV2.ingestQuestEvent(req.user.id, {
                    seasonKey,
                    eventType,
                    eventValue,
                    source,
                    occurredAt,
                    metadata,
                    requestId: req.header('x-request-id') || null,
                    idempotencyKey
                });

                return {
                    ...result,
                    resourceType: 'battle_pass_event',
                    resourceId: `${result.seasonId}:${req.user.id}:${eventType}`
                };
            }
        });

        return res.status(mutation.replayed ? 200 : 201).json({
            success: true,
            replayed: mutation.replayed,
            ...mutation.responseBody
        });
    } catch (error) {
        return res.status(bpErrorStatus(error.code)).json({
            success: false,
            error: {
                code: bpErrorCode(error),
                message: error.message
            }
        });
    }
});

/**
 * @route POST /api/subscriptions/battle-pass/v2/claim-tier
 * @desc Claim tier reward (idempotent)
 */
router.post('/battle-pass/v2/claim-tier', authMiddleware, async (req, res) => {
    const idempotencyKey = readIdempotencyKey(req);
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
        return res.status(400).json({
            success: false,
            error: {
                code: 'IDEMPOTENCY_KEY_REQUIRED',
                message: 'idempotency-key header is required'
            }
        });
    }

    const tierNumber = req.body?.tierNumber;
    const seasonKey = typeof req.body?.seasonKey === 'string' ? req.body.seasonKey.trim() : null;

    try {
        const mutation = await executeIdempotentMutation({
            scope: 'battlepass.v2.claim_tier',
            idempotencyKey,
            requestPayload: {
                userId: req.user.id,
                tierNumber,
                seasonKey
            },
            actorUserId: req.user.id,
            targetUserId: req.user.id,
            entityType: 'battle_pass_reward_claim',
            eventType: 'battle_pass.v2.claim_tier',
            requestId: req.header('x-request-id') || null,
            mutationFn: async () => {
                const result = await battlePassServiceV2.claimTierReward(req.user.id, {
                    seasonKey,
                    tierNumber,
                    requestId: req.header('x-request-id') || null,
                    idempotencyKey,
                    claimType: 'tier'
                });

                return {
                    ...result,
                    resourceType: 'battle_pass_reward_claim',
                    resourceId: `${result.seasonId}:${req.user.id}:${result.tierNumber}`
                };
            }
        });

        return res.status(mutation.replayed ? 200 : 201).json({
            success: true,
            replayed: mutation.replayed,
            ...mutation.responseBody
        });
    } catch (error) {
        return res.status(bpErrorStatus(error.code)).json({
            success: false,
            error: {
                code: bpErrorCode(error),
                message: error.message
            }
        });
    }
});

/**
 * @route POST /api/subscriptions/battle-pass/v2/team/create
 * @desc Create BP team (idempotent)
 */
router.post('/battle-pass/v2/team/create', authMiddleware, async (req, res) => {
    const idempotencyKey = readIdempotencyKey(req);
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
        return res.status(400).json({
            success: false,
            error: {
                code: 'IDEMPOTENCY_KEY_REQUIRED',
                message: 'idempotency-key header is required'
            }
        });
    }

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const seasonKey = typeof req.body?.seasonKey === 'string' ? req.body.seasonKey.trim() : null;

    try {
        const mutation = await executeIdempotentMutation({
            scope: 'battlepass.v2.team.create',
            idempotencyKey,
            requestPayload: {
                userId: req.user.id,
                seasonKey,
                name
            },
            actorUserId: req.user.id,
            targetUserId: req.user.id,
            entityType: 'battle_pass_team',
            eventType: 'battle_pass.v2.team_create',
            requestId: req.header('x-request-id') || null,
            mutationFn: async () => {
                const result = await battlePassServiceV2.createTeam(req.user.id, {
                    seasonKey,
                    name,
                    requestId: req.header('x-request-id') || null,
                    idempotencyKey
                });
                return {
                    ...result,
                    resourceType: 'battle_pass_team',
                    resourceId: result.team.id
                };
            }
        });

        return res.status(mutation.replayed ? 200 : 201).json({
            success: true,
            replayed: mutation.replayed,
            ...mutation.responseBody
        });
    } catch (error) {
        return res.status(bpErrorStatus(error.code)).json({
            success: false,
            error: {
                code: bpErrorCode(error),
                message: error.message
            }
        });
    }
});

/**
 * @route POST /api/subscriptions/battle-pass/v2/team/join
 * @desc Join BP team (idempotent)
 */
router.post('/battle-pass/v2/team/join', authMiddleware, async (req, res) => {
    const idempotencyKey = readIdempotencyKey(req);
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
        return res.status(400).json({
            success: false,
            error: {
                code: 'IDEMPOTENCY_KEY_REQUIRED',
                message: 'idempotency-key header is required'
            }
        });
    }

    const teamId = typeof req.body?.teamId === 'string' ? req.body.teamId.trim() : '';
    const seasonKey = typeof req.body?.seasonKey === 'string' ? req.body.seasonKey.trim() : null;

    try {
        const mutation = await executeIdempotentMutation({
            scope: 'battlepass.v2.team.join',
            idempotencyKey,
            requestPayload: {
                userId: req.user.id,
                seasonKey,
                teamId
            },
            actorUserId: req.user.id,
            targetUserId: req.user.id,
            entityType: 'battle_pass_team',
            eventType: 'battle_pass.v2.team_join',
            requestId: req.header('x-request-id') || null,
            mutationFn: async () => {
                const result = await battlePassServiceV2.joinTeam(req.user.id, {
                    seasonKey,
                    teamId,
                    requestId: req.header('x-request-id') || null,
                    idempotencyKey
                });
                return {
                    ...result,
                    resourceType: 'battle_pass_team',
                    resourceId: result.teamId
                };
            }
        });

        return res.status(mutation.replayed ? 200 : 201).json({
            success: true,
            replayed: mutation.replayed,
            ...mutation.responseBody
        });
    } catch (error) {
        return res.status(bpErrorStatus(error.code)).json({
            success: false,
            error: {
                code: bpErrorCode(error),
                message: error.message
            }
        });
    }
});

/**
 * @route POST /api/subscriptions/battle-pass/v2/team/contribute
 * @desc Contribute XP to team progress with daily cap (idempotent)
 */
router.post('/battle-pass/v2/team/contribute', authMiddleware, async (req, res) => {
    const idempotencyKey = readIdempotencyKey(req);
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
        return res.status(400).json({
            success: false,
            error: {
                code: 'IDEMPOTENCY_KEY_REQUIRED',
                message: 'idempotency-key header is required'
            }
        });
    }

    const xpAmount = req.body?.xpAmount;
    const seasonKey = typeof req.body?.seasonKey === 'string' ? req.body.seasonKey.trim() : null;

    try {
        const mutation = await executeIdempotentMutation({
            scope: 'battlepass.v2.team.contribute',
            idempotencyKey,
            requestPayload: {
                userId: req.user.id,
                seasonKey,
                xpAmount
            },
            actorUserId: req.user.id,
            targetUserId: req.user.id,
            entityType: 'battle_pass_team_progress',
            eventType: 'battle_pass.v2.team_contribute',
            requestId: req.header('x-request-id') || null,
            mutationFn: async () => {
                const result = await battlePassServiceV2.contributeTeamXp(req.user.id, {
                    seasonKey,
                    xpAmount,
                    requestId: req.header('x-request-id') || null,
                    idempotencyKey
                });

                return {
                    ...result,
                    resourceType: 'battle_pass_team_progress',
                    resourceId: `${result.seasonId}:${result.teamId}:${req.user.id}`
                };
            }
        });

        return res.status(mutation.replayed ? 200 : 201).json({
            success: true,
            replayed: mutation.replayed,
            ...mutation.responseBody
        });
    } catch (error) {
        return res.status(bpErrorStatus(error.code)).json({
            success: false,
            error: {
                code: bpErrorCode(error),
                message: error.message
            }
        });
    }
});

/**
 * @route POST /api/subscriptions/battle-pass/v2/gift-tier
 * @desc Gift battle pass tiers to a friend (idempotent)
 */
router.post('/battle-pass/v2/gift-tier', requireMonetizationAuth, async (req, res) => {
    const idempotencyKey = readIdempotencyKey(req);
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
        return res.status(400).json({
            success: false,
            error: {
                code: 'IDEMPOTENCY_KEY_REQUIRED',
                message: 'idempotency-key header is required'
            }
        });
    }

    const recipientUserId = typeof req.body?.recipientUserId === 'string' ? req.body.recipientUserId.trim() : '';
    const seasonKey = typeof req.body?.seasonKey === 'string' ? req.body.seasonKey.trim() : null;
    const parsedTierCount = parseInt(req.body?.tierCount, 10);
    const tierCount = Number.isFinite(parsedTierCount) ? parsedTierCount : 1;
    const message = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 240) : null;

    if (!recipientUserId) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'INVALID_RECIPIENT',
                message: 'recipientUserId is required'
            }
        });
    }

    if (recipientUserId === req.user.id) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'SELF_GIFT_FORBIDDEN',
                message: 'Cannot gift battle pass tiers to yourself'
            }
        });
    }

    if (!Number.isInteger(tierCount) || tierCount < 1 || tierCount > 25) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'INVALID_TIER_COUNT',
                message: 'tierCount must be between 1 and 25'
            }
        });
    }

    try {
        const mutation = await executeIdempotentMutation({
            scope: 'battlepass.v2.gift_tier',
            idempotencyKey,
            requestPayload: {
                senderUserId: req.user.id,
                recipientUserId,
                seasonKey,
                tierCount,
                message
            },
            actorUserId: req.user.id,
            targetUserId: recipientUserId,
            entityType: 'battle_pass_tier_gift',
            eventType: 'battle_pass.v2.gift_tier',
            requestId: req.header('x-request-id') || null,
            perfChannel: 'battlepass.v2.gift_tier',
            mutationFn: async () => {
                const season = await battlePassServiceV2.getSeasonByKeyOrActive(seasonKey);
                const isFriend = await ensureFriends(req.user.id, recipientUserId);
                if (!isFriend) {
                    const err = new Error('Recipient must be a friend');
                    err.code = 'FRIENDSHIP_REQUIRED';
                    throw err;
                }

                const baseXpPerTier = Math.max(1, parseInt(season.base_xp_per_tier || 1000, 10));
                const xpGranted = baseXpPerTier * tierCount;
                const gemCost = BATTLE_PASS_GIFT_TIER_GEM_COST * tierCount;

                await postgres.query('BEGIN');
                try {
                    const senderResult = await postgres.query(
                        'SELECT id, gem_dust FROM users WHERE id = $1 LIMIT 1 FOR UPDATE',
                        [req.user.id]
                    );
                    const recipientResult = await postgres.query(
                        'SELECT id FROM users WHERE id = $1 LIMIT 1 FOR UPDATE',
                        [recipientUserId]
                    );

                    const sender = senderResult.rows[0];
                    const recipient = recipientResult.rows[0];

                    if (!sender) {
                        const err = new Error('Sender not found');
                        err.code = 'SENDER_NOT_FOUND';
                        throw err;
                    }
                    if (!recipient) {
                        const err = new Error('Recipient not found');
                        err.code = 'RECIPIENT_NOT_FOUND';
                        throw err;
                    }

                    const currentGems = Number(sender.gem_dust || 0);
                    if (currentGems < gemCost) {
                        const err = new Error('Not enough gems');
                        err.code = 'INSUFFICIENT_GEMS';
                        throw err;
                    }

                    await postgres.query(
                        `
                          INSERT INTO battle_pass_user_progress (
                            id, season_id, user_id, xp, level, enrolled_at, created_at, updated_at
                          )
                          VALUES ($1, $2, $3, 0, 1, NOW(), NOW(), NOW())
                          ON CONFLICT (season_id, user_id)
                          DO NOTHING
                        `,
                        [makeId('bp_prog'), season.id, recipientUserId]
                    );

                    const progressResult = await postgres.query(
                        `
                          SELECT id, xp, level
                          FROM battle_pass_user_progress
                          WHERE season_id = $1
                            AND user_id = $2
                          LIMIT 1
                          FOR UPDATE
                        `,
                        [season.id, recipientUserId]
                    );

                    const recipientProgress = progressResult.rows[0];
                    const oldXp = Number(recipientProgress?.xp || 0);
                    const newXp = oldXp + xpGranted;
                    const newTier = Math.floor(newXp / baseXpPerTier) + 1;

                    await postgres.query(
                        `
                          UPDATE users
                          SET gem_dust = $2,
                              updated_at = NOW()
                          WHERE id = $1
                        `,
                        [req.user.id, currentGems - gemCost]
                    );

                    await postgres.query(
                        `
                          UPDATE battle_pass_user_progress
                          SET xp = $3,
                              level = $4,
                              last_event_at = NOW(),
                              updated_at = NOW()
                          WHERE season_id = $1
                            AND user_id = $2
                        `,
                        [season.id, recipientUserId, newXp, newTier]
                    );

                    const giftId = makeId('gift');
                    await postgres.query(
                        `
                          INSERT INTO gift_transactions (
                            id, gift_type, sender_user_id, recipient_user_id, status, message,
                            metadata, delivered_at, created_at, updated_at
                          )
                          VALUES (
                            $1, 'battle_pass_tier', $2, $3, 'delivered', $4,
                            $5::jsonb, NOW(), NOW(), NOW()
                          )
                        `,
                        [
                            giftId,
                            req.user.id,
                            recipientUserId,
                            message,
                            JSON.stringify({
                                seasonId: season.id,
                                seasonKey: season.season_key,
                                tierCount,
                                xpGranted,
                                gemCost
                            })
                        ]
                    );

                    await appendAuditEvent({
                        actorUserId: req.user.id,
                        targetUserId: recipientUserId,
                        entityType: 'battle_pass_tier_gift',
                        entityId: giftId,
                        eventType: 'battle_pass.v2.tier_gifted',
                        requestId: req.header('x-request-id') || null,
                        idempotencyKey,
                        metadata: {
                            seasonId: season.id,
                            seasonKey: season.season_key,
                            tierCount,
                            xpGranted,
                            gemCost
                        }
                    });

                    await postgres.query('COMMIT');

                    return {
                        success: true,
                        giftId,
                        recipientUserId,
                        seasonId: season.id,
                        seasonKey: season.season_key,
                        tierCount,
                        xpGranted,
                        gemCost,
                        recipientNewTier: newTier,
                        recipientNewXp: newXp,
                        resourceType: 'battle_pass_tier_gift',
                        resourceId: giftId
                    };
                } catch (error) {
                    await postgres.query('ROLLBACK');
                    throw error;
                }
            }
        });

        return res.status(mutation.replayed ? 200 : 201).json({
            success: true,
            replayed: mutation.replayed,
            ...mutation.responseBody
        });
    } catch (error) {
        return res.status(bpErrorStatus(error.code)).json({
            success: false,
            error: {
                code: bpErrorCode(error),
                message: error.message
            }
        });
    }
});

/**
 * @route POST /api/subscriptions/battle-pass/v2/claim-retroactive
 * @desc Explicit retroactive tier reward claim (idempotent)
 */
router.post('/battle-pass/v2/claim-retroactive', authMiddleware, async (req, res) => {
    const idempotencyKey = readIdempotencyKey(req);
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
        return res.status(400).json({
            success: false,
            error: {
                code: 'IDEMPOTENCY_KEY_REQUIRED',
                message: 'idempotency-key header is required'
            }
        });
    }

    const seasonKey = typeof req.body?.seasonKey === 'string' ? req.body.seasonKey.trim() : null;
    const fromTier = req.body?.fromTier;
    const toTier = req.body?.toTier;

    try {
        const mutation = await executeIdempotentMutation({
            scope: 'battlepass.v2.retroactive_claim',
            idempotencyKey,
            requestPayload: {
                userId: req.user.id,
                seasonKey,
                fromTier,
                toTier
            },
            actorUserId: req.user.id,
            targetUserId: req.user.id,
            entityType: 'battle_pass_retroactive_claim',
            eventType: 'battle_pass.v2.retroactive_claim',
            requestId: req.header('x-request-id') || null,
            mutationFn: async () => {
                const result = await battlePassServiceV2.claimRetroactiveRewards(req.user.id, {
                    seasonKey,
                    fromTier,
                    toTier,
                    requestId: req.header('x-request-id') || null,
                    idempotencyKey
                });

                return {
                    ...result,
                    resourceType: 'battle_pass_retroactive_claim',
                    resourceId: `${result.seasonId}:${req.user.id}`
                };
            }
        });

        return res.status(mutation.replayed ? 200 : 201).json({
            success: true,
            replayed: mutation.replayed,
            ...mutation.responseBody
        });
    } catch (error) {
        return res.status(bpErrorStatus(error.code)).json({
            success: false,
            error: {
                code: bpErrorCode(error),
                message: error.message
            }
        });
    }
});

module.exports = router;
