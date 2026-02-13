/**
 * First-Time Bonuses API Routes
 * Rewards for first-time actions: first game, first win, first referral, first marketplace sale
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireMonetizationAuth } = require('../middleware/auth');
const postgres = require('../models/postgres');
const { executeIdempotentMutation, appendAuditEvent, makeId } = require('../services/economyMutationService');

// Bonus configuration
const BONUS_CONFIG = {
    first_game_played: {
        souls: 500,
        bloodGems: 0,
        horrorCoins: 0,
        description: 'First game played!'
    },
    first_win_per_game: {
        souls: 1000,
        bloodGems: 10,
        horrorCoins: 0,
        description: 'First win in {gameName}!'
    },
    first_referral: {
        souls: 0,
        bloodGems: 500,
        horrorCoins: 0,
        description: 'First friend referred!'
    },
    first_marketplace_sale: {
        souls: 0,
        bloodGems: 100,
        horrorCoins: 0,
        description: 'First marketplace sale!'
    },
    first_purchase: {
        souls: 0,
        bloodGems: 50,
        horrorCoins: 0,
        description: 'First store purchase!'
    },
    first_achievement: {
        souls: 250,
        bloodGems: 5,
        horrorCoins: 0,
        description: 'First achievement unlocked!'
    },
    first_perfect_run: {
        souls: 2000,
        bloodGems: 25,
        horrorCoins: 0,
        description: 'First perfect run (no deaths)!'
    },
    first_boss_kill: {
        souls: 750,
        bloodGems: 15,
        horrorCoins: 0,
        description: 'First boss defeated!'
    },
    first_daily_challenge: {
        souls: 300,
        bloodGems: 0,
        horrorCoins: 25,
        description: 'First daily challenge completed!'
    },
    first_prestige: {
        souls: 0,
        bloodGems: 100,
        horrorCoins: 0,
        description: 'First prestige achieved!'
    }
};

function getIdempotencyKey(req) {
    return req.header('idempotency-key') || req.header('x-idempotency-key') || req.body?.idempotencyKey || null;
}

function fail(res, status, code, message, details = null) {
    return res.status(status).json({ success: false, error: { code, message, details } });
}

function logBonusError(error, metadata = {}) {
    console.error('[api/first-time-bonuses] request failed', {
        code: error?.code || null,
        message: error?.message || String(error),
        stack: error?.stack || null,
        ...metadata
    });
}

function failInternal(res, status, code, publicMessage, error, metadata = {}) {
    logBonusError(error, { status, code, ...metadata });
    return fail(res, status, code, publicMessage);
}

function ensurePg(res) {
    if (!postgres.isEnabled()) {
        fail(res, 503, 'PG_REQUIRED', 'This endpoint requires PostgreSQL-backed economy mode');
        return false;
    }
    return true;
}

/**
 * @route GET /api/first-time-bonuses/status
 * @desc Get user's first-time bonus status
 */
router.get('/status', authMiddleware, async (req, res) => {
    if (!ensurePg(res)) return;

    try {
        const result = await postgres.query(
            `
            SELECT bonus_type, game_id, claimed_at
            FROM first_time_bonuses
            WHERE user_id = $1
            `,
            [req.user.id]
        );

        const claimed = {};
        result.rows.forEach(row => {
            const key = row.game_id ? `${row.bonus_type}:${row.game_id}` : row.bonus_type;
            claimed[key] = {
                claimed: true,
                claimedAt: row.claimed_at
            };
        });

        // Build status for all bonus types
        const status = {};
        Object.keys(BONUS_CONFIG).forEach(type => {
            if (type === 'first_win_per_game') {
                // This is per-game, so we list claimed games
                status[type] = {
                    config: BONUS_CONFIG[type],
                    claimedGames: result.rows
                        .filter(r => r.bonus_type === 'first_win_per_game')
                        .map(r => r.game_id)
                };
            } else {
                status[type] = {
                    config: BONUS_CONFIG[type],
                    claimed: !!claimed[type],
                    claimedAt: claimed[type]?.claimedAt || null
                };
            }
        });

        return res.json({
            success: true,
            bonuses: status,
            totalClaimed: result.rows.length
        });
    } catch (error) {
        return failInternal(res, 500, 'BONUS_STATUS_FAILED', 'Unable to load bonus status', error, {
            userId: req.user?.id || null
        });
    }
});

/**
 * @route POST /api/first-time-bonuses/claim
 * @desc Claim a first-time bonus
 */
router.post('/claim', requireMonetizationAuth, async (req, res) => {
    if (!ensurePg(res)) return;

    const idempotencyKey = getIdempotencyKey(req);
    if (!idempotencyKey) {
        return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');
    }

    const bonusType = typeof req.body?.bonusType === 'string' ? req.body.bonusType.trim() : '';
    const gameId = typeof req.body?.gameId === 'string' ? req.body.gameId.trim() : null;

    if (!bonusType || !BONUS_CONFIG[bonusType]) {
        return fail(res, 400, 'INVALID_BONUS_TYPE', 'Valid bonusType is required');
    }

    try {
        const mutation = await executeIdempotentMutation({
            scope: 'first_time_bonus.claim',
            idempotencyKey,
            requestPayload: { userId: req.user.id, bonusType, gameId },
            actorUserId: req.user.id,
            targetUserId: req.user.id,
            entityType: 'first_time_bonus',
            eventType: 'first_time_bonus_claimed',
            requestId: req.header('x-request-id') || null,
            mutationFn: async () => {
                // Check if already claimed
                const existingQuery = gameId
                    ? 'SELECT id FROM first_time_bonuses WHERE user_id = $1 AND bonus_type = $2 AND game_id = $3'
                    : 'SELECT id FROM first_time_bonuses WHERE user_id = $1 AND bonus_type = $2 AND game_id IS NULL';
                
                const existingParams = gameId ? [req.user.id, bonusType, gameId] : [req.user.id, bonusType];
                const existing = await postgres.query(existingQuery, existingParams);

                if (existing.rows.length > 0) {
                    const err = new Error('Bonus already claimed');
                    err.code = 'BONUS_ALREADY_CLAIMED';
                    throw err;
                }

                const config = BONUS_CONFIG[bonusType];
                const bonusId = makeId('ftb');

                await postgres.query('BEGIN');
                try {
                    // Insert bonus record
                    await postgres.query(
                        `
                        INSERT INTO first_time_bonuses (
                            id, user_id, bonus_type, game_id, souls_reward, blood_gems_reward, 
                            horror_coins_reward, claimed_at, idempotency_key, created_at
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, NOW())
                        `,
                        [bonusId, req.user.id, bonusType, gameId || null, config.souls, config.bloodGems, config.horrorCoins, idempotencyKey]
                    );

                    // Get user for currency update
                    const userResult = await postgres.query(
                        'SELECT id, souls, blood_gems, horror_coins FROM users WHERE id = $1 LIMIT 1 FOR UPDATE',
                        [req.user.id]
                    );
                    const user = userResult.rows[0];
                    if (!user) {
                        const err = new Error('User not found');
                        err.code = 'USER_NOT_FOUND';
                        throw err;
                    }

                    // Update currencies
                    const newSouls = Number(user.souls || 0) + config.souls;
                    const newBloodGems = Number(user.blood_gems || 0) + config.bloodGems;
                    const newHorrorCoins = Number(user.horror_coins || 0) + config.horrorCoins;

                    await postgres.query(
                        'UPDATE users SET souls = $2, blood_gems = $3, horror_coins = $4, updated_at = NOW() WHERE id = $1',
                        [req.user.id, newSouls, newBloodGems, newHorrorCoins]
                    );

                    // Audit log
                    await appendAuditEvent({
                        actorUserId: req.user.id,
                        targetUserId: req.user.id,
                        entityType: 'currency',
                        entityId: req.user.id,
                        eventType: 'currency.credit',
                        requestId: req.header('x-request-id') || null,
                        idempotencyKey,
                        metadata: {
                            reason: 'first_time_bonus',
                            bonusType,
                            gameId,
                            souls: config.souls,
                            bloodGems: config.bloodGems,
                            horrorCoins: config.horrorCoins
                        }
                    });

                    await postgres.query('COMMIT');

                    return {
                        success: true,
                        bonusId,
                        bonusType,
                        gameId,
                        rewards: {
                            souls: config.souls,
                            bloodGems: config.bloodGems,
                            horrorCoins: config.horrorCoins
                        },
                        newBalances: {
                            souls: newSouls,
                            bloodGems: newBloodGems,
                            horrorCoins: newHorrorCoins
                        },
                        description: config.description.replace('{gameName}', gameId || ''),
                        resourceType: 'first_time_bonus',
                        resourceId: bonusId
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
            return fail(res, 409, error.code, 'Idempotency key already used with different payload');
        }
        if (error.code === 'IDEMPOTENCY_IN_PROGRESS') {
            return fail(res, 409, error.code, 'Request with this idempotency key is currently in progress');
        }

        const statusByCode = {
            BONUS_ALREADY_CLAIMED: 409,
            USER_NOT_FOUND: 404
        };

        const errorMessages = {
            BONUS_ALREADY_CLAIMED: 'Bonus already claimed',
            USER_NOT_FOUND: 'User not found'
        };

        return failInternal(
            res,
            statusByCode[error.code] || 400,
            error.code || 'BONUS_CLAIM_FAILED',
            errorMessages[error.code] || 'Unable to claim bonus',
            error,
            { userId: req.user?.id || null, bonusType, gameId }
        );
    }
});

/**
 * @route POST /api/first-time-bonuses/check
 * @desc Check and auto-claim eligible bonuses (called by games)
 */
router.post('/check', requireMonetizationAuth, async (req, res) => {
    if (!ensurePg(res)) return;

    const triggerType = typeof req.body?.triggerType === 'string' ? req.body.triggerType.trim() : '';
    const gameId = typeof req.body?.gameId === 'string' ? req.body.gameId.trim() : null;
    const isWin = req.body?.isWin === true;
    const isPerfectRun = req.body?.isPerfectRun === true;

    if (!triggerType) {
        return fail(res, 400, 'INVALID_TRIGGER_TYPE', 'triggerType is required');
    }

    try {
        const bonusesToCheck = [];

        // Determine which bonuses to check based on trigger
        if (triggerType === 'game_complete') {
            bonusesToCheck.push('first_game_played');
            if (isWin && gameId) {
                bonusesToCheck.push('first_win_per_game');
            }
            if (isPerfectRun) {
                bonusesToCheck.push('first_perfect_run');
            }
        } else if (triggerType === 'referral_converted') {
            bonusesToCheck.push('first_referral');
        } else if (triggerType === 'marketplace_sale') {
            bonusesToCheck.push('first_marketplace_sale');
        } else if (triggerType === 'purchase') {
            bonusesToCheck.push('first_purchase');
        } else if (triggerType === 'achievement') {
            bonusesToCheck.push('first_achievement');
        } else if (triggerType === 'boss_kill') {
            bonusesToCheck.push('first_boss_kill');
        } else if (triggerType === 'daily_challenge') {
            bonusesToCheck.push('first_daily_challenge');
        } else if (triggerType === 'prestige') {
            bonusesToCheck.push('first_prestige');
        }

        // Check which bonuses are already claimed
        const claimedResult = await postgres.query(
            `
            SELECT bonus_type, game_id FROM first_time_bonuses 
            WHERE user_id = $1 AND bonus_type = ANY($2)
            `,
            [req.user.id, bonusesToCheck]
        );

        const claimed = new Set(
            claimedResult.rows.map(r => r.game_id ? `${r.bonus_type}:${r.game_id}` : r.bonus_type)
        );

        const eligible = bonusesToCheck.filter(type => {
            if (type === 'first_win_per_game' && gameId) {
                return !claimed.has(`${type}:${gameId}`);
            }
            return !claimed.has(type);
        });

        return res.json({
            success: true,
            triggerType,
            gameId,
            eligibleBonuses: eligible.map(type => ({
                type,
                config: BONUS_CONFIG[type],
                gameId: type === 'first_win_per_game' ? gameId : null
            }))
        });
    } catch (error) {
        return failInternal(res, 500, 'BONUS_CHECK_FAILED', 'Unable to check bonuses', error, {
            userId: req.user?.id || null
        });
    }
});

module.exports = router;
