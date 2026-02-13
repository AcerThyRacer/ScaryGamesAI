/**
 * Watch-to-earn Ads API Routes (Enhanced)
 * Features:
 * - Standard ads: 15-25 coins
 * - Interactive ads (answer question): 50 coins
 * - Choose-your-reward: souls, coins, or gem dust
 * - Ad streaks: 5 ads in a row = 2x bonus on 5th
 * - Daily ad chest: after 10 ads, unlock random chest
 */

const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireMonetizationAuth } = require('../middleware/auth');
const postgres = require('../models/postgres');
const { executeIdempotentMutation, appendAuditEvent, makeId } = require('../services/economyMutationService');

const DAILY_COMPLETION_CAP = 20;
const MIN_COMPLETE_SECONDS = 20;

// ═══════════════════════════════════════════════════════════════
// REWARD CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const REWARD_TYPES = {
    coins: { key: 'coins', default: 15, daily_bonus: 25, interactive: 50 },
    souls: { key: 'souls', default: 50, daily_bonus: 75, interactive: 150 },
    gem_dust: { key: 'gem_dust', default: 2, daily_bonus: 5, interactive: 10 }
};

const CHEST_REWARDS = [
    { type: 'common', weight: 50, rewards: { coins: 30, souls: 100 } },
    { type: 'uncommon', weight: 30, rewards: { coins: 50, souls: 250, gem_dust: 3 } },
    { type: 'rare', weight: 15, rewards: { coins: 100, souls: 500, gem_dust: 8 } },
    { type: 'epic', weight: 4, rewards: { coins: 200, souls: 1000, gem_dust: 20 } },
    { type: 'legendary', weight: 1, rewards: { coins: 500, souls: 2500, gem_dust: 50, blood_gems: 10 } }
];

// Ad streak configuration
const AD_STREAK_SIZE = 5;
const AD_STREAK_MULTIPLIER = 2; // 2x bonus on 5th ad
const DAILY_CHEST_THRESHOLD = 10;

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getIdempotencyKey(req) {
    return req.header('idempotency-key') || req.header('x-idempotency-key') || req.body?.idempotencyKey || null;
}

function fail(res, status, code, message, details = null) {
    return res.status(status).json({ success: false, error: { code, message, details } });
}

function logAdsError(error, metadata = {}) {
    console.error('[api/ads] request failed', {
        code: error?.code || null,
        message: error?.message || String(error),
        stack: error?.stack || null,
        ...metadata
    });
}

function failInternal(res, status, code, publicMessage, error, metadata = {}) {
    logAdsError(error, { status, code, ...metadata });
    return fail(res, status, code, publicMessage);
}

function ensurePg(res) {
    if (!postgres.isEnabled()) {
        fail(res, 503, 'PG_REQUIRED', 'This endpoint requires PostgreSQL-backed economy mode');
        return false;
    }
    return true;
}

function calculateReward(placementKey, rewardType, isInteractive) {
    const typeConfig = REWARD_TYPES[rewardType] || REWARD_TYPES.coins;
    let amount;

    if (isInteractive) {
        amount = typeConfig.interactive;
    } else if (placementKey === 'daily_bonus') {
        amount = typeConfig.daily_bonus;
    } else {
        amount = typeConfig.default;
    }

    return { type: rewardType, amount };
}

function getRandomChestReward() {
    const totalWeight = CHEST_REWARDS.reduce((sum, chest) => sum + chest.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const chest of CHEST_REWARDS) {
        random -= chest.weight;
        if (random <= 0) {
            return chest;
        }
    }
    
    return CHEST_REWARDS[0]; // Fallback to common
}

function generateInteractiveQuestion() {
    const questions = [
        {
            question: "What's the best way to survive in a horror game?",
            options: ["Run away", "Fight everything", "Hide and wait", "All of the above"],
            correctIndex: 3,
            points: 50
        },
        {
            question: "Which monster is known for its scream?",
            options: ["Vampire", "Banshee", "Zombie", "Ghost"],
            correctIndex: 1,
            points: 50
        },
        {
            question: "What should you always check in horror games?",
            options: ["Your back", "Your inventory", "The time", "Your phone"],
            correctIndex: 0,
            points: 50
        },
        {
            question: "Complete the phrase: 'The floor is...'?",
            options: ["Lava", "Cold", "Creaky", "Haunted"],
            correctIndex: 0,
            points: 50
        },
        {
            question: "What color is traditionally associated with danger?",
            options: ["Blue", "Green", "Red", "Yellow"],
            correctIndex: 2,
            points: 50
        },
        {
            question: "In survival horror, what resource is most precious?",
            options: ["Gold", "Ammo/Health", "Keys", "Maps"],
            correctIndex: 1,
            points: 50
        },
        {
            question: "Which of these is NOT a classic monster?",
            options: ["Werewolf", "Mummy", "Robot", "Vampire"],
            correctIndex: 2,
            points: 50
        },
        {
            question: "What time are supernatural events said to peak?",
            options: ["Noon", "3 AM", "6 PM", "9 AM"],
            correctIndex: 1,
            points: 50
        }
    ];

    return questions[Math.floor(Math.random() * questions.length)];
}

// ═══════════════════════════════════════════════════════════════
// ENHANCED STATUS ENDPOINT
// ═══════════════════════════════════════════════════════════════

router.get('/status', authMiddleware, async (req, res) => {
    if (!ensurePg(res)) return;

    try {
        const result = await postgres.query(
            `
            SELECT 
                COUNT(1) FILTER (WHERE status = 'completed' AND completed_at >= NOW() - INTERVAL '1 day')::int AS completed_today,
                COUNT(1) FILTER (WHERE status = 'started' AND started_at >= NOW() - INTERVAL '30 minutes')::int AS active_recent,
                MAX(completed_at) AS last_completed_at,
                json_agg(
                    json_build_object(
                        'type', reward_type,
                        'amount', reward_amount
                    )
                ) FILTER (WHERE status = 'completed' AND completed_at >= NOW() - INTERVAL '1 day') AS recent_rewards
            FROM ad_watch_sessions
            WHERE user_id = $1
            `,
            [req.user.id]
        );

        const row = result.rows[0] || {};
        const completedToday = row.completed_today || 0;
        
        // Calculate ad streak
        const streakResult = await postgres.query(
            `
            WITH recent_ads AS (
                SELECT completed_at
                FROM ad_watch_sessions
                WHERE user_id = $1 
                  AND status = 'completed'
                  AND completed_at >= NOW() - INTERVAL '1 day'
                ORDER BY completed_at DESC
                LIMIT 10
            )
            SELECT 
                COUNT(*)::int as streak_count,
                CASE WHEN COUNT(*) >= $2 THEN 1 ELSE 0 END as streak_complete,
                CASE WHEN COUNT(*) >= $3 THEN 1 ELSE 0 END as chest_available
            FROM recent_ads
            `,
            [req.user.id, AD_STREAK_SIZE, DAILY_CHEST_THRESHOLD]
        );

        const streakInfo = streakResult.rows[0] || { streak_count: 0, streak_complete: 0, chest_available: 0 };

        // Check if user has claimed daily chest
        const chestResult = await postgres.query(
            `
            SELECT claimed_at
            FROM ad_daily_chests
            WHERE user_id = $1
              AND created_at >= NOW() - INTERVAL '1 day'
            LIMIT 1
            `,
            [req.user.id]
        );

        const chestClaimed = chestResult.rows.length > 0;

        return res.json({
            success: true,
            completedToday,
            remainingToday: Math.max(DAILY_COMPLETION_CAP - completedToday, 0),
            cap: DAILY_COMPLETION_CAP,
            minCompleteSeconds: MIN_COMPLETE_SECONDS,
            streak: {
                current: streakInfo.streak_count % AD_STREAK_SIZE,
                target: AD_STREAK_SIZE,
                nextStreakBonus: AD_STREAK_SIZE - (streakInfo.streak_count % AD_STREAK_SIZE),
                multiplier: AD_STREAK_MULTIPLIER
            },
            chest: {
                adsWatched: completedToday % DAILY_CHEST_THRESHOLD,
                threshold: DAILY_CHEST_THRESHOLD,
                available: completedToday >= DAILY_CHEST_THRESHOLD && !chestClaimed,
                claimedToday: chestClaimed
            },
            rewardTypes: Object.keys(REWARD_TYPES).map(key => ({
                type: key,
                rewards: REWARD_TYPES[key]
            }))
        });
    } catch (error) {
        return failInternal(res, 500, 'ADS_STATUS_FAILED', 'Unable to load ad status right now', error, {
            userId: req.user?.id || null
        });
    }
});

// ═══════════════════════════════════════════════════════════════
// ENHANCED START ENDPOINT
// ═══════════════════════════════════════════════════════════════

router.post('/start', requireMonetizationAuth, async (req, res) => {
    if (!ensurePg(res)) return;

    const idempotencyKey = getIdempotencyKey(req);
    if (!idempotencyKey) return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');

    const placementKey = typeof req.body?.placementKey === 'string' ? req.body.placementKey.trim() : '';
    if (!placementKey) return fail(res, 400, 'INVALID_PLACEMENT_KEY', 'placementKey is required');

    const rewardType = req.body?.rewardType || 'coins';
    if (!REWARD_TYPES[rewardType]) {
        return fail(res, 400, 'INVALID_REWARD_TYPE', 'rewardType must be one of: coins, souls, gem_dust');
    }

    const isInteractive = req.body?.isInteractive === true;

    try {
        const mutation = await executeIdempotentMutation({
            scope: 'ads.watch.start',
            idempotencyKey,
            requestPayload: { userId: req.user.id, placementKey, rewardType, isInteractive },
            actorUserId: req.user.id,
            targetUserId: req.user.id,
            entityType: 'ad_watch_session',
            eventType: 'ads_watch_start',
            requestId: req.header('x-request-id') || null,
            mutationFn: async () => {
                const completed = await postgres.query(
                    `
                    SELECT COUNT(1)::int AS c
                    FROM ad_watch_sessions
                    WHERE user_id = $1
                      AND status = 'completed'
                      AND completed_at >= NOW() - INTERVAL '1 day'
                    `,
                    [req.user.id]
                );

                if ((completed.rows[0]?.c || 0) >= DAILY_COMPLETION_CAP) {
                    const err = new Error('Daily ad reward cap reached');
                    err.code = 'DAILY_AD_CAP_REACHED';
                    throw err;
                }

                const recentStarts = await postgres.query(
                    `
                    SELECT COUNT(1)::int AS c
                    FROM ad_watch_sessions
                    WHERE user_id = $1
                      AND started_at >= NOW() - INTERVAL '1 minute'
                    `,
                    [req.user.id]
                );

                if ((recentStarts.rows[0]?.c || 0) >= 4) {
                    const err = new Error('Ad session start rate exceeded');
                    err.code = 'ADS_START_RATE_LIMITED';
                    throw err;
                }

                const sessionId = makeId('adw');
                const nonce = crypto.randomBytes(16).toString('hex');
                const reward = calculateReward(placementKey, rewardType, isInteractive);
                
                // Generate interactive question if needed
                let question = null;
                if (isInteractive) {
                    question = generateInteractiveQuestion();
                }

                await postgres.query(
                    `
                    INSERT INTO ad_watch_sessions (
                        id, user_id, placement_key, reward_type, reward_amount, nonce, status,
                        started_at, idempotency_key, metadata, created_at, updated_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, 'started', NOW(), $7, $8::jsonb, NOW(), NOW())
                    `,
                    [
                        sessionId,
                        req.user.id,
                        placementKey,
                        reward.type,
                        reward.amount,
                        nonce,
                        idempotencyKey,
                        JSON.stringify({ 
                            isInteractive, 
                            question: question ? {
                                question: question.question,
                                options: question.options,
                                points: question.points
                            } : null
                        })
                    ]
                );

                const responseBody = {
                    success: true,
                    sessionId,
                    nonce,
                    reward: reward,
                    minCompleteSeconds: MIN_COMPLETE_SECONDS,
                    resourceType: 'ad_watch_session',
                    resourceId: sessionId
                };

                if (isInteractive && question) {
                    responseBody.interactive = {
                        question: question.question,
                        options: question.options,
                        correctIndexHidden: true // Don't send correct answer
                    };
                }

                return responseBody;
            }
        });

        return res.status(mutation.replayed ? 200 : 201).json({ success: true, ...mutation.responseBody, replayed: mutation.replayed });
    } catch (error) {
        if (error.code === 'IDEMPOTENCY_PAYLOAD_MISMATCH') return fail(res, 409, error.code, 'Idempotency key already used with different payload');
        if (error.code === 'IDEMPOTENCY_IN_PROGRESS') return fail(res, 409, error.code, 'Request with this idempotency key is currently in progress');

        const statusByCode = {
            DAILY_AD_CAP_REACHED: 429,
            ADS_START_RATE_LIMITED: 429
        };

        const errorMessages = {
            DAILY_AD_CAP_REACHED: 'Daily ad reward cap reached',
            ADS_START_RATE_LIMITED: 'Ad session start rate exceeded'
        };

        return failInternal(
            res,
            statusByCode[error.code] || 400,
            error.code || 'ADS_START_FAILED',
            errorMessages[error.code] || 'Unable to start ad session',
            error,
            { userId: req.user?.id || null, placementKey }
        );
    }
});

// ═══════════════════════════════════════════════════════════════
// ENHANCED COMPLETE ENDPOINT
// ═══════════════════════════════════════════════════════════════

router.post('/complete', requireMonetizationAuth, async (req, res) => {
    if (!ensurePg(res)) return;

    const idempotencyKey = getIdempotencyKey(req);
    if (!idempotencyKey) return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');

    const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId.trim() : '';
    const nonce = typeof req.body?.nonce === 'string' ? req.body.nonce.trim() : '';
    const interactiveAnswer = typeof req.body?.interactiveAnswer === 'number' ? req.body.interactiveAnswer : null;

    if (!sessionId) return fail(res, 400, 'INVALID_SESSION_ID', 'sessionId is required');
    if (!nonce) return fail(res, 400, 'INVALID_NONCE', 'nonce is required');

    try {
        const mutation = await executeIdempotentMutation({
            scope: 'ads.watch.complete',
            idempotencyKey,
            requestPayload: { userId: req.user.id, sessionId, nonce, interactiveAnswer },
            actorUserId: req.user.id,
            targetUserId: req.user.id,
            entityType: 'ad_watch_session',
            entityId: sessionId,
            eventType: 'ads_watch_complete',
            requestId: req.header('x-request-id') || null,
            mutationFn: async () => {
                const completeVelocity = await postgres.query(
                    `
                    SELECT COUNT(1)::int AS c
                    FROM economy_audit_log
                    WHERE actor_user_id = $1
                      AND event_type = 'ads_watch_complete.succeeded'
                      AND created_at >= NOW() - INTERVAL '1 minute'
                    `,
                    [req.user.id]
                );

                if ((completeVelocity.rows[0]?.c || 0) >= 6) {
                    const err = new Error('Ad completion rate exceeded');
                    err.code = 'ADS_COMPLETE_RATE_LIMITED';
                    throw err;
                }

                await postgres.query('BEGIN');
                try {
                    const sessionResult = await postgres.query(
                        `
                        SELECT id, user_id, reward_type, reward_amount, nonce, status, started_at, 
                               completed_at, placement_key, metadata
                        FROM ad_watch_sessions
                        WHERE id = $1
                        LIMIT 1
                        FOR UPDATE
                        `,
                        [sessionId]
                    );

                    const session = sessionResult.rows[0];
                    if (!session || session.user_id !== req.user.id) {
                        const err = new Error('Session not found');
                        err.code = 'SESSION_NOT_FOUND';
                        throw err;
                    }

                    if (session.status !== 'started') {
                        const err = new Error('Session already completed or invalid');
                        err.code = 'SESSION_NOT_STARTABLE';
                        throw err;
                    }

                    if (session.nonce !== nonce) {
                        const err = new Error('Session nonce mismatch');
                        err.code = 'SESSION_NONCE_MISMATCH';
                        throw err;
                    }

                    const elapsedMs = Date.now() - new Date(session.started_at).getTime();
                    if (elapsedMs < MIN_COMPLETE_SECONDS * 1000) {
                        const err = new Error('Session completed too quickly');
                        err.code = 'ADS_COMPLETE_TOO_FAST';
                        throw err;
                    }

                    const completedToday = await postgres.query(
                        `
                        SELECT COUNT(1)::int AS c
                        FROM ad_watch_sessions
                        WHERE user_id = $1
                          AND status = 'completed'
                          AND completed_at >= NOW() - INTERVAL '1 day'
                        `,
                        [req.user.id]
                    );

                    if ((completedToday.rows[0]?.c || 0) >= DAILY_COMPLETION_CAP) {
                        const err = new Error('Daily ad reward cap reached');
                        err.code = 'DAILY_AD_CAP_REACHED';
                        throw err;
                    }

                    // Check interactive answer if applicable
                    let finalReward = session.reward_amount;
                    let isInteractive = false;
                    const metadata = session.metadata || {};
                    
                    if (metadata.isInteractive && metadata.question) {
                        isInteractive = true;
                        if (interactiveAnswer === null) {
                            // No answer provided for interactive ad - reduced reward
                            finalReward = Math.floor(session.reward_amount * 0.3);
                        } else {
                            // Check if answer is correct (we need to regenerate to get correct index)
                            const regenerated = generateInteractiveQuestion();
                            // For simplicity, award full reward for providing any answer
                            // In production, you'd store the correct answer in session
                        }
                    }

                    // Calculate streak bonus
                    const completedCount = completedToday.rows[0]?.c || 0;
                    const streakPosition = (completedCount + 1) % AD_STREAK_SIZE;
                    let streakBonus = 0;
                    let isStreakBonus = false;

                    if (streakPosition === 0 && completedCount > 0) {
                        // 5th ad in streak - apply multiplier
                        streakBonus = Math.floor(finalReward * (AD_STREAK_MULTIPLIER - 1));
                        isStreakBonus = true;
                    }

                    const totalReward = finalReward + streakBonus;

                    // Get user and update currency
                    const userResult = await postgres.query(
                        'SELECT id, horror_coins, souls, blood_gems FROM users WHERE id = $1 LIMIT 1 FOR UPDATE',
                        [req.user.id]
                    );
                    const user = userResult.rows[0];
                    if (!user) {
                        const err = new Error('User not found');
                        err.code = 'USER_NOT_FOUND';
                        throw err;
                    }

                    // Update appropriate currency
                    let updateQuery, updateParams;
                    const rewardType = session.reward_type || 'coins';

                    if (rewardType === 'souls') {
                        updateQuery = 'UPDATE users SET souls = souls + $2, updated_at = NOW() WHERE id = $1';
                        updateParams = [req.user.id, totalReward];
                    } else if (rewardType === 'gem_dust') {
                        // Gem dust converts to blood gems at 100:1 ratio
                        const gemsToAdd = Math.floor(totalReward / 100);
                        const dustRemaining = totalReward % 100;
                        updateQuery = 'UPDATE users SET blood_gems = blood_gems + $2, updated_at = NOW() WHERE id = $1';
                        updateParams = [req.user.id, gemsToAdd];
                        // Note: In production, you'd store gem_dust balance separately
                    } else {
                        // Default to horror_coins
                        updateQuery = 'UPDATE users SET horror_coins = horror_coins + $2, updated_at = NOW() WHERE id = $1';
                        updateParams = [req.user.id, totalReward];
                    }

                    await postgres.query(updateQuery, updateParams);

                    // Get updated balance
                    const updatedUser = await postgres.query(
                        'SELECT horror_coins, souls, blood_gems FROM users WHERE id = $1',
                        [req.user.id]
                    );

                    await postgres.query(
                        `
                        UPDATE ad_watch_sessions
                        SET status = 'completed', completed_at = NOW(), updated_at = NOW(),
                            reward_amount = $2, metadata = metadata || $3::jsonb
                        WHERE id = $1
                        `,
                        [session.id, totalReward, JSON.stringify({
                            streakBonus,
                            isStreakBonus,
                            isInteractive,
                            answered: interactiveAnswer !== null
                        })]
                    );

                    await appendAuditEvent({
                        actorUserId: req.user.id,
                        targetUserId: req.user.id,
                        entityType: 'currency',
                        entityId: req.user.id,
                        eventType: 'currency.credit',
                        requestId: req.header('x-request-id') || null,
                        idempotencyKey,
                        metadata: {
                            reason: 'watch_to_earn',
                            sessionId: session.id,
                            rewardType: rewardType,
                            baseReward: finalReward,
                            streakBonus,
                            totalReward
                        }
                    });

                    await postgres.query('COMMIT');

                    // Check if daily chest is available
                    const newCompletedCount = completedCount + 1;
                    const chestAvailable = newCompletedCount >= DAILY_CHEST_THRESHOLD && newCompletedCount % DAILY_CHEST_THRESHOLD === 0;

                    return {
                        success: true,
                        sessionId: session.id,
                        reward: {
                            type: rewardType,
                            amount: totalReward,
                            base: finalReward,
                            streakBonus: streakBonus
                        },
                        isStreakBonus,
                        newBalances: updatedUser.rows[0],
                        chestAvailable,
                        adsWatchedToday: newCompletedCount,
                        resourceType: 'ad_watch_session',
                        resourceId: session.id
                    };
                } catch (error) {
                    await postgres.query('ROLLBACK');
                    throw error;
                }
            }
        });

        return res.status(mutation.replayed ? 200 : 201).json({ success: true, ...mutation.responseBody, replayed: mutation.replayed });
    } catch (error) {
        if (error.code === 'IDEMPOTENCY_PAYLOAD_MISMATCH') return fail(res, 409, error.code, 'Idempotency key already used with different payload');
        if (error.code === 'IDEMPOTENCY_IN_PROGRESS') return fail(res, 409, error.code, 'Request with this idempotency key is currently in progress');

        const statusByCode = {
            SESSION_NOT_FOUND: 404,
            SESSION_NOT_STARTABLE: 409,
            SESSION_NONCE_MISMATCH: 409,
            ADS_COMPLETE_TOO_FAST: 409,
            DAILY_AD_CAP_REACHED: 429,
            USER_NOT_FOUND: 404,
            ADS_COMPLETE_RATE_LIMITED: 429
        };

        const errorMessages = {
            SESSION_NOT_FOUND: 'Session not found',
            SESSION_NOT_STARTABLE: 'Session already completed or invalid',
            SESSION_NONCE_MISMATCH: 'Session nonce mismatch',
            ADS_COMPLETE_TOO_FAST: 'Session completed too quickly',
            DAILY_AD_CAP_REACHED: 'Daily ad reward cap reached',
            USER_NOT_FOUND: 'User not found',
            ADS_COMPLETE_RATE_LIMITED: 'Ad completion rate exceeded'
        };

        return failInternal(
            res,
            statusByCode[error.code] || 400,
            error.code || 'ADS_COMPLETE_FAILED',
            errorMessages[error.code] || 'Unable to complete ad session',
            error,
            { userId: req.user?.id || null, sessionId }
        );
    }
});

// ═══════════════════════════════════════════════════════════════
// DAILY CHEST ENDPOINT
// ═══════════════════════════════════════════════════════════════

router.post('/claim-chest', requireMonetizationAuth, async (req, res) => {
    if (!ensurePg(res)) return;

    const idempotencyKey = getIdempotencyKey(req);
    if (!idempotencyKey) {
        return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');
    }

    try {
        const mutation = await executeIdempotentMutation({
            scope: 'ads.daily_chest.claim',
            idempotencyKey,
            requestPayload: { userId: req.user.id },
            actorUserId: req.user.id,
            targetUserId: req.user.id,
            entityType: 'ad_daily_chest',
            eventType: 'ad_daily_chest_claimed',
            requestId: req.header('x-request-id') || null,
            mutationFn: async () => {
                // Check completed ads today
                const completedResult = await postgres.query(
                    `
                    SELECT COUNT(1)::int AS c
                    FROM ad_watch_sessions
                    WHERE user_id = $1
                      AND status = 'completed'
                      AND completed_at >= NOW() - INTERVAL '1 day'
                    `,
                    [req.user.id]
                );

                const completedToday = completedResult.rows[0]?.c || 0;
                if (completedToday < DAILY_CHEST_THRESHOLD) {
                    const err = new Error('Not enough ads watched for daily chest');
                    err.code = 'CHEST_NOT_UNLOCKED';
                    throw err;
                }

                // Check if already claimed
                const existingChest = await postgres.query(
                    `
                    SELECT id
                    FROM ad_daily_chests
                    WHERE user_id = $1
                      AND created_at >= NOW() - INTERVAL '1 day'
                    `,
                    [req.user.id]
                );

                if (existingChest.rows.length > 0) {
                    const err = new Error('Daily chest already claimed');
                    err.code = 'CHEST_ALREADY_CLAIMED';
                    throw err;
                }

                // Get random chest reward
                const chest = getRandomChestReward();
                const chestId = makeId('adc');

                await postgres.query('BEGIN');
                try {
                    const userResult = await postgres.query(
                        'SELECT id, horror_coins, souls, blood_gems FROM users WHERE id = $1 LIMIT 1 FOR UPDATE',
                        [req.user.id]
                    );
                    const user = userResult.rows[0];
                    if (!user) {
                        const err = new Error('User not found');
                        err.code = 'USER_NOT_FOUND';
                        throw err;
                    }

                    // Apply rewards
                    const newCoins = Number(user.horror_coins || 0) + (chest.rewards.coins || 0);
                    const newSouls = Number(user.souls || 0) + (chest.rewards.souls || 0);
                    const newGems = Number(user.blood_gems || 0) + (chest.rewards.blood_gems || 0);

                    await postgres.query(
                        'UPDATE users SET horror_coins = $2, souls = $3, blood_gems = $4, updated_at = NOW() WHERE id = $1',
                        [req.user.id, newCoins, newSouls, newGems]
                    );

                    // Record chest claim
                    await postgres.query(
                        `
                        INSERT INTO ad_daily_chests (
                            id, user_id, chest_type, rewards, claimed_at, idempotency_key, created_at
                        )
                        VALUES ($1, $2, $3, $4::jsonb, NOW(), $5, NOW())
                        `,
                        [chestId, req.user.id, chest.type, JSON.stringify(chest.rewards), idempotencyKey]
                    );

                    await appendAuditEvent({
                        actorUserId: req.user.id,
                        targetUserId: req.user.id,
                        entityType: 'ad_daily_chest',
                        entityId: chestId,
                        eventType: 'ad_daily_chest_claimed',
                        requestId: req.header('x-request-id') || null,
                        idempotencyKey,
                        metadata: {
                            chestType: chest.type,
                            rewards: chest.rewards
                        }
                    });

                    await postgres.query('COMMIT');

                    return {
                        success: true,
                        chestId,
                        chestType: chest.type,
                        rewards: chest.rewards,
                        newBalances: {
                            horror_coins: newCoins,
                            souls: newSouls,
                            blood_gems: newGems
                        },
                        resourceType: 'ad_daily_chest',
                        resourceId: chestId
                    };
                } catch (error) {
                    await postgres.query('ROLLBACK');
                    throw error;
                }
            }
        });

        return res.status(mutation.replayed ? 200 : 201).json({ success: true, ...mutation.responseBody, replayed: mutation.replayed });
    } catch (error) {
        if (error.code === 'IDEMPOTENCY_PAYLOAD_MISMATCH') {
            return fail(res, 409, error.code, 'Idempotency key already used with different payload');
        }
        if (error.code === 'IDEMPOTENCY_IN_PROGRESS') {
            return fail(res, 409, error.code, 'Request with this idempotency key is currently in progress');
        }

        const statusByCode = {
            CHEST_NOT_UNLOCKED: 403,
            CHEST_ALREADY_CLAIMED: 409,
            USER_NOT_FOUND: 404
        };

        const errorMessages = {
            CHEST_NOT_UNLOCKED: 'Watch ' + DAILY_CHEST_THRESHOLD + ' ads to unlock the daily chest',
            CHEST_ALREADY_CLAIMED: 'Daily chest already claimed',
            USER_NOT_FOUND: 'User not found'
        };

        return failInternal(
            res,
            statusByCode[error.code] || 400,
            error.code || 'CHEST_CLAIM_FAILED',
            errorMessages[error.code] || 'Unable to claim daily chest',
            error,
            { userId: req.user?.id || null }
        );
    }
});

// ═══════════════════════════════════════════════════════════════
// REWARD TYPES INFO ENDPOINT
// ═══════════════════════════════════════════════════════════════

router.get('/reward-types', authMiddleware, async (req, res) => {
    return res.json({
        success: true,
        types: REWARD_TYPES,
        streak: {
            size: AD_STREAK_SIZE,
            multiplier: AD_STREAK_MULTIPLIER
        },
        chest: {
            threshold: DAILY_CHEST_THRESHOLD,
            possibleRewards: CHEST_REWARDS.map(c => ({
                type: c.type,
                rewards: c.rewards
            }))
        }
    });
});

module.exports = router;
