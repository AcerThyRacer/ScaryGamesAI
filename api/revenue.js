/**
 * Revenue Streams API (5.3)
 * Tournament Tickets, XP Boosters, Character Packs, Season Pass, Founder's Edition.
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireMonetizationAuth } = require('../middleware/auth');
const postgres = require('../models/postgres');
const dataAccess = require('../models/data-access');
const paymentService = require('../services/paymentService');
const { executeIdempotentMutation, makeId } = require('../services/economyMutationService');

const MAX_PURCHASE_QTY = 20;
const MAX_ACTIVE_BOOSTERS = 2;
const MAX_STACKED_MULTIPLIER = 3.0;
const MAX_REVENUE_PURCHASES_PER_MINUTE = 8;

function getIdempotencyKey(req) {
  return req.header('idempotency-key')
    || req.header('x-idempotency-key')
    || req.body?.idempotencyKey
    || null;
}

function fail(res, status, code, message, details = null) {
  return res.status(status).json({
    success: false,
    error: { code, message, details }
  });
}

function logRevenueError(error, metadata = {}) {
  console.error('[api/revenue] request failed', {
    code: error?.code || null,
    message: error?.message || String(error),
    stack: error?.stack || null,
    ...metadata
  });
}

function failInternal(res, status, code, publicMessage, error, metadata = {}) {
  logRevenueError(error, { status, code, ...metadata });
  return fail(res, status, code, publicMessage);
}

function ensurePg(res) {
  if (!postgres.isEnabled()) {
    fail(res, 503, 'PG_REQUIRED', 'This endpoint requires PostgreSQL-backed economy mode');
    return false;
  }
  return true;
}

function toPositiveInt(value, fieldName, min = 1, max = 100000) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    const err = new Error(`${fieldName} must be between ${min} and ${max}`);
    err.code = `INVALID_${fieldName.toUpperCase()}`;
    throw err;
  }
  return parsed;
}

function toStream(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function parseCharacterKeys(raw) {
  if (Array.isArray(raw)) {
    return [...new Set(raw.map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean))];
  }
  return [];
}

function buildStatusByCode(errorCode) {
  const map = {
    IDEMPOTENCY_PAYLOAD_MISMATCH: 409,
    IDEMPOTENCY_IN_PROGRESS: 409,
    USER_NOT_FOUND: 404,
    INVALID_STREAM: 400,
    INVALID_SKU: 400,
    SKU_NOT_FOUND: 404,
    INVALID_QUANTITY: 400,
    INVALID_COVERAGEYEAR: 400,
    INVALID_MULTIPLIER: 400,
    INVALID_DURATIONMINUTES: 400,
    INVALID_TOURNAMENTID: 400,
    INVALID_ENTITLEMENTID: 400,
    ENTITLEMENT_NOT_FOUND: 404,
    ENTITLEMENT_NOT_ACTIVE: 409,
    ENTITLEMENT_ALREADY_CONSUMED: 409,
    TOURNAMENT_TICKET_REQUIRED: 409,
    TOURNAMENT_ALREADY_ENTERED: 409,
    BOOSTER_ACTIVE_CAP_REACHED: 409,
    BOOSTER_STACK_CAP_EXCEEDED: 409,
    NO_XP_BOOSTER_AVAILABLE: 409,
    CHARACTER_KEYS_REQUIRED: 400,
    CHARACTER_PACK_METADATA_INVALID: 409,
    FOUNDER_ALREADY_OWNED: 409,
    REVENUE_PURCHASE_RATE_LIMITED: 429
  };

  return map[errorCode] || 400;
}

async function enforceRevenuePurchaseVelocity(userId, stream) {
  const result = await postgres.query(
    `
      SELECT COUNT(1)::int AS c
      FROM orders
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '1 minute'
        AND COALESCE(metadata->>'stream', '') = $2
    `,
    [userId, stream]
  );

  if ((result.rows[0]?.c || 0) >= MAX_REVENUE_PURCHASES_PER_MINUTE) {
    const err = new Error('Revenue purchase rate limit exceeded');
    err.code = 'REVENUE_PURCHASE_RATE_LIMITED';
    throw err;
  }
}

function normalizePurchaseConfig(stream, reqBody, sku) {
  const baseQuantity = reqBody.quantity == null ? 1 : toPositiveInt(reqBody.quantity, 'quantity', 1, MAX_PURCHASE_QTY);
  const currentYear = new Date().getUTCFullYear();

  if (stream === 'tournament_ticket') {
    return {
      entitlementType: 'tournament_ticket',
      quantity: baseQuantity,
      metadata: {
        stream,
        ticketTier: typeof reqBody.ticketTier === 'string' ? reqBody.ticketTier.trim() || 'standard' : 'standard'
      }
    };
  }

  if (stream === 'xp_booster') {
    const multiplierRaw = reqBody.multiplier ?? sku?.metadata?.multiplier ?? 1.25;
    const durationRaw = reqBody.durationMinutes ?? sku?.metadata?.durationMinutes ?? 60;

    const multiplier = Number(multiplierRaw);
    if (!Number.isFinite(multiplier) || multiplier < 1.0 || multiplier > 5.0) {
      const err = new Error('multiplier must be between 1.0 and 5.0');
      err.code = 'INVALID_MULTIPLIER';
      throw err;
    }

    const durationMinutes = toPositiveInt(durationRaw, 'durationMinutes', 5, 1440);

    return {
      entitlementType: 'xp_booster',
      quantity: baseQuantity,
      metadata: {
        stream,
        multiplier: Number(multiplier.toFixed(3)),
        durationMinutes
      }
    };
  }

  if (stream === 'character_pack') {
    const requestedCharacterKeys = Array.isArray(reqBody.characterKeys) ? reqBody.characterKeys : [];
    const characterKeys = parseCharacterKeys(requestedCharacterKeys.length ? requestedCharacterKeys : (sku?.metadata?.characterKeys || []));
    if (characterKeys.length === 0) {
      const err = new Error('characterKeys are required for character_pack');
      err.code = 'CHARACTER_KEYS_REQUIRED';
      throw err;
    }

    return {
      entitlementType: 'character_pack',
      quantity: 1,
      metadata: {
        stream,
        packKey: sku?.sku_key || null,
        characterKeys
      }
    };
  }

  if (stream === 'season_pass') {
    const coverageYear = reqBody.coverageYear == null
      ? currentYear
      : toPositiveInt(reqBody.coverageYear, 'coverageYear', 2020, 2200);

    return {
      entitlementType: 'season_pass_annual',
      quantity: 1,
      metadata: {
        stream,
        coverageYear
      }
    };
  }

  if (stream === 'founder_edition') {
    return {
      entitlementType: 'founder_edition',
      quantity: 1,
      metadata: {
        stream,
        transfer: {
          transferable: false,
          eligibilityStatus: 'not_eligible',
          policyVersion: '5.3'
        },
        lifetimePerks: ['founder_badge', 'founder_title', 'legacy_cosmetics']
      }
    };
  }

  const err = new Error('Unsupported revenue stream');
  err.code = 'INVALID_STREAM';
  throw err;
}

/**
 * @route GET /api/revenue/status
 * @desc Current entitlement and stream status snapshot
 */
router.get('/status', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  try {
    const userId = req.user.id;
    const activeEntitlements = await dataAccess.listEntitlementsByUser(userId, { status: 'active', limit: 300 });
    const activeBoosters = await dataAccess.listActiveXpBoosterActivations(userId);
    const xpMultiplier = await dataAccess.getEffectiveXpBoosterMultiplier(userId);
    const unlockedCharacters = await dataAccess.listCharacterUnlocks(userId);
    const founderOwnership = await dataAccess.getFounderOwnership(userId);
    const seasonCoverage = await dataAccess.getSeasonPassCoverage(userId, new Date().getUTCFullYear());

    return res.json({
      success: true,
      entitlements: activeEntitlements,
      booster: {
        activeCount: activeBoosters.length,
        active: activeBoosters,
        effectiveMultiplier: xpMultiplier
      },
      characters: {
        unlockedCount: unlockedCharacters.length,
        unlocks: unlockedCharacters
      },
      seasonPass: {
        currentYear: new Date().getUTCFullYear(),
        covered: !!seasonCoverage,
        coverage: seasonCoverage
      },
      founder: {
        owned: !!founderOwnership,
        ownership: founderOwnership
      }
    });
  } catch (error) {
    return failInternal(res, 500, 'REVENUE_STATUS_FAILED', 'Unable to load revenue status right now', error, {
      userId: req.user?.id || null
    });
  }
});

/**
 * @route POST /api/revenue/purchase
 * @desc Purchase one of the 5.3 revenue stream products and grant server-side entitlements
 */
router.post('/purchase', requireMonetizationAuth, async (req, res) => {
  if (!ensurePg(res)) return;

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');
  }

  const skuKey = typeof req.body?.skuKey === 'string' ? req.body.skuKey.trim() : '';
  const stream = toStream(req.body?.stream);

  if (!skuKey) return fail(res, 400, 'INVALID_SKU', 'skuKey is required');
  if (!stream) return fail(res, 400, 'INVALID_STREAM', 'stream is required');

  try {
    const mutation = await executeIdempotentMutation({
      scope: `revenue.purchase.${stream}`,
      idempotencyKey,
      requestPayload: {
        userId: req.user.id,
        stream,
        skuKey,
        quantity: req.body?.quantity,
        multiplier: req.body?.multiplier,
        durationMinutes: req.body?.durationMinutes,
        characterKeys: req.body?.characterKeys,
        coverageYear: req.body?.coverageYear
      },
      actorUserId: req.user.id,
      targetUserId: req.user.id,
      entityType: 'revenue_purchase',
      eventType: `revenue.${stream}.purchase`,
      requestId: req.header('x-request-id') || null,
      mutationFn: async () => {
        await enforceRevenuePurchaseVelocity(req.user.id, stream);

        const userCheck = await postgres.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [req.user.id]);
        if (!userCheck.rows[0]) {
          const err = new Error('User not found');
          err.code = 'USER_NOT_FOUND';
          throw err;
        }

        const sku = await dataAccess.getSkuByKey(skuKey);
        if (!sku) {
          const err = new Error('SKU not found');
          err.code = 'SKU_NOT_FOUND';
          throw err;
        }

        const normalized = normalizePurchaseConfig(stream, req.body || {}, sku);
        const amount = Number(sku.unit_amount || 0);
        const totalAmount = amount * normalized.quantity;

        await postgres.query('BEGIN');
        try {
          const order = await dataAccess.createOrder({
            id: makeId('ord'),
            userId: req.user.id,
            status: 'completed',
            currency: sku.currency || 'USD',
            subtotalAmount: totalAmount,
            taxAmount: 0,
            discountAmount: 0,
            totalAmount,
            metadata: {
              stream,
              skuKey,
              source: 'revenue_api_5_3'
            }
          });

          await dataAccess.createOrderItem({
            id: makeId('ord_item'),
            orderId: order.id,
            skuId: sku.id,
            productId: sku.product_id,
            quantity: normalized.quantity,
            unitAmount: amount,
            totalAmount,
            metadata: {
              stream
            }
          });

          await paymentService.recordRevenuePurchaseTransaction({
            userId: req.user.id,
            stream,
            skuKey,
            orderId: order.id,
            amount: totalAmount,
            currency: sku.currency || 'USD',
            requestId: req.header('x-request-id') || null,
            idempotencyKey,
            metadata: { source: 'revenue_api_5_3' }
          });

          if (stream === 'founder_edition') {
            const existingFounder = await dataAccess.getFounderOwnership(req.user.id);
            if (existingFounder) {
              const err = new Error('Founder edition already owned');
              err.code = 'FOUNDER_ALREADY_OWNED';
              throw err;
            }
          }

          const entitlement = await dataAccess.grantEntitlement({
            id: makeId('ent'),
            userId: req.user.id,
            productId: sku.product_id,
            skuId: sku.id,
            entitlementType: normalized.entitlementType,
            status: 'active',
            quantity: normalized.quantity,
            grantedByOrderId: order.id,
            grantedReason: `${stream}_purchase`,
            startsAt: new Date().toISOString(),
            expiresAt: null,
            metadata: normalized.metadata
          });

          if (stream === 'season_pass') {
            await dataAccess.upsertSeasonPassCoverage({
              id: makeId('sp_cov'),
              userId: req.user.id,
              coverageYear: normalized.metadata.coverageYear,
              entitlementId: entitlement.id,
              status: 'active',
              metadata: {
                stream,
                sourceOrderId: order.id
              }
            });
          }

          if (stream === 'founder_edition') {
            const ownership = await dataAccess.createFounderOwnership({
              id: makeId('founder'),
              userId: req.user.id,
              entitlementId: entitlement.id,
              transferable: false,
              transferEligibilityStatus: 'not_eligible',
              metadata: {
                stream,
                sourceOrderId: order.id,
                lifetimePerksGranted: true
              }
            });

            await dataAccess.createFounderTransferEvent({
              id: makeId('founder_tx'),
              founderOwnershipId: ownership.id,
              fromUserId: req.user.id,
              toUserId: null,
              transferStatus: 'initialized',
              reason: 'initial_purchase',
              metadata: {
                transferable: false,
                eligibilityStatus: 'not_eligible'
              }
            });
          }

          await postgres.query('COMMIT');

          return {
            success: true,
            replayed: false,
            stream,
            skuKey,
            orderId: order.id,
            entitlementId: entitlement.id,
            quantity: normalized.quantity,
            amount: totalAmount,
            currency: sku.currency || 'USD',
            resourceType: 'revenue_purchase',
            resourceId: order.id
          };
        } catch (error) {
          await postgres.query('ROLLBACK');
          throw error;
        }
      }
    });

    return res.status(mutation.replayed ? 200 : 201).json({ success: true, ...mutation.responseBody, replayed: mutation.replayed });
  } catch (error) {
    const errorMessages = {
      USER_NOT_FOUND: 'User not found',
      INVALID_STREAM: 'stream is required',
      INVALID_SKU: 'skuKey is required',
      SKU_NOT_FOUND: 'SKU not found',
      INVALID_QUANTITY: 'quantity must be between 1 and 20',
      INVALID_COVERAGEYEAR: 'coverageYear must be between 2020 and 2200',
      INVALID_MULTIPLIER: 'multiplier must be between 1.0 and 5.0',
      INVALID_DURATIONMINUTES: 'durationMinutes must be between 5 and 1440',
      CHARACTER_KEYS_REQUIRED: 'characterKeys are required for character_pack',
      FOUNDER_ALREADY_OWNED: 'Founder edition already owned',
      REVENUE_PURCHASE_RATE_LIMITED: 'Revenue purchase rate limit exceeded'
    };

    return failInternal(
      res,
      buildStatusByCode(error.code),
      error.code || 'REVENUE_PURCHASE_FAILED',
      errorMessages[error.code] || 'Unable to complete revenue purchase',
      error,
      { userId: req.user?.id || null, stream, skuKey }
    );
  }
});

/**
 * @route POST /api/revenue/tournament/consume
 * @desc Consume one tournament ticket to enter a tournament (double-spend protected)
 */
router.post('/tournament/consume', requireMonetizationAuth, async (req, res) => {
  if (!ensurePg(res)) return;

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');
  }

  const tournamentId = typeof req.body?.tournamentId === 'string' ? req.body.tournamentId.trim() : '';
  if (!tournamentId) return fail(res, 400, 'INVALID_TOURNAMENTID', 'tournamentId is required');

  try {
    const mutation = await executeIdempotentMutation({
      scope: 'revenue.tournament.consume',
      idempotencyKey,
      requestPayload: { userId: req.user.id, tournamentId },
      actorUserId: req.user.id,
      targetUserId: req.user.id,
      entityType: 'tournament_ticket',
      eventType: 'revenue.tournament.consume',
      requestId: req.header('x-request-id') || null,
      mutationFn: async () => {
        const consumed = await dataAccess.consumeTournamentTicket({
          id: makeId('ttc'),
          userId: req.user.id,
          tournamentId,
          idempotencyKey,
          metadata: {
            source: 'revenue_api_5_3'
          }
        });

        if ((consumed?.already_used || 0) > 0) {
          const err = new Error('Tournament entry already consumed for this tournament');
          err.code = 'TOURNAMENT_ALREADY_ENTERED';
          throw err;
        }

        if ((consumed?.has_ticket || 0) === 0 || !consumed?.entitlement_id) {
          const err = new Error('No tournament ticket available');
          err.code = 'TOURNAMENT_TICKET_REQUIRED';
          throw err;
        }

        await dataAccess.createEntitlementConsumption({
          id: makeId('ent_consume'),
          entitlementId: consumed.entitlement_id,
          userId: req.user.id,
          quantity: 1,
          idempotencyKey,
          metadata: {
            reason: 'tournament_entry',
            tournamentId
          }
        });

        return {
          success: true,
          tournamentId,
          entitlementId: consumed.entitlement_id,
          remaining: Math.max(0, Number(consumed.quantity || 0) - Number(consumed.consumed_quantity || 0)),
          resourceType: 'tournament_consume',
          resourceId: `${req.user.id}:${tournamentId}`
        };
      }
    });

    return res.status(mutation.replayed ? 200 : 201).json({ success: true, ...mutation.responseBody, replayed: mutation.replayed });
  } catch (error) {
    const errorMessages = {
      TOURNAMENT_ALREADY_ENTERED: 'Tournament entry already consumed for this tournament',
      TOURNAMENT_TICKET_REQUIRED: 'No tournament ticket available'
    };
    return failInternal(
      res,
      buildStatusByCode(error.code),
      error.code || 'TOURNAMENT_CONSUME_FAILED',
      errorMessages[error.code] || 'Unable to consume tournament ticket',
      error,
      { userId: req.user?.id || null, tournamentId }
    );
  }
});

/**
 * @route POST /api/revenue/character-pack/redeem
 * @desc Consume character pack entitlement and unlock characters.
 */
router.post('/character-pack/redeem', requireMonetizationAuth, async (req, res) => {
  if (!ensurePg(res)) return;

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');
  }

  const entitlementId = typeof req.body?.entitlementId === 'string' ? req.body.entitlementId.trim() : '';
  if (!entitlementId) return fail(res, 400, 'INVALID_ENTITLEMENTID', 'entitlementId is required');

  try {
    const mutation = await executeIdempotentMutation({
      scope: 'revenue.character_pack.redeem',
      idempotencyKey,
      requestPayload: { userId: req.user.id, entitlementId },
      actorUserId: req.user.id,
      targetUserId: req.user.id,
      entityType: 'character_pack',
      eventType: 'revenue.character_pack.redeem',
      requestId: req.header('x-request-id') || null,
      mutationFn: async () => {
        const entitlement = await dataAccess.getEntitlementById(entitlementId);
        if (!entitlement || entitlement.user_id !== req.user.id || entitlement.entitlement_type !== 'character_pack') {
          const err = new Error('Character pack entitlement not found');
          err.code = 'ENTITLEMENT_NOT_FOUND';
          throw err;
        }

        if (entitlement.status !== 'active' || (entitlement.expires_at && new Date(entitlement.expires_at) <= new Date())) {
          const err = new Error('Entitlement is not active');
          err.code = 'ENTITLEMENT_NOT_ACTIVE';
          throw err;
        }

        const remaining = Number(entitlement.quantity || 0) - Number(entitlement.consumed_quantity || 0);
        if (remaining <= 0) {
          const err = new Error('Entitlement already consumed');
          err.code = 'ENTITLEMENT_ALREADY_CONSUMED';
          throw err;
        }

        const characterKeys = parseCharacterKeys(entitlement.metadata?.characterKeys || []);
        if (characterKeys.length === 0) {
          const err = new Error('Character pack metadata is invalid');
          err.code = 'CHARACTER_PACK_METADATA_INVALID';
          throw err;
        }

        await postgres.query('BEGIN');
        try {
          const unlocked = [];
          for (const key of characterKeys) {
            const inserted = await dataAccess.createCharacterUnlock({
              id: makeId('char_unlock'),
              userId: req.user.id,
              characterKey: key,
              sourceEntitlementId: entitlement.id,
              sourcePackKey: entitlement.metadata?.packKey || null,
              metadata: {
                source: 'character_pack_redeem'
              }
            });
            if (inserted) unlocked.push(key);
          }

          const updatedEntitlement = await dataAccess.consumeEntitlementQuantity({
            entitlementId: entitlement.id,
            quantity: 1
          });

          if (!updatedEntitlement) {
            const err = new Error('Entitlement already consumed');
            err.code = 'ENTITLEMENT_ALREADY_CONSUMED';
            throw err;
          }

          await dataAccess.createEntitlementConsumption({
            id: makeId('ent_consume'),
            entitlementId: entitlement.id,
            userId: req.user.id,
            quantity: 1,
            idempotencyKey,
            metadata: {
              reason: 'character_pack_redeem',
              unlockedCharacters: unlocked
            }
          });

          await postgres.query('COMMIT');

          return {
            success: true,
            entitlementId: entitlement.id,
            unlockedCharacters: unlocked,
            resourceType: 'character_pack_redeem',
            resourceId: entitlement.id
          };
        } catch (error) {
          await postgres.query('ROLLBACK');
          throw error;
        }
      }
    });

    return res.status(mutation.replayed ? 200 : 201).json({ success: true, ...mutation.responseBody, replayed: mutation.replayed });
  } catch (error) {
    const errorMessages = {
      ENTITLEMENT_NOT_FOUND: 'Character pack entitlement not found',
      ENTITLEMENT_NOT_ACTIVE: 'Entitlement is not active',
      ENTITLEMENT_ALREADY_CONSUMED: 'Entitlement already consumed',
      CHARACTER_PACK_METADATA_INVALID: 'Character pack metadata is invalid'
    };
    return failInternal(
      res,
      buildStatusByCode(error.code),
      error.code || 'CHARACTER_PACK_REDEEM_FAILED',
      errorMessages[error.code] || 'Unable to redeem character pack entitlement',
      error,
      { userId: req.user?.id || null, entitlementId }
    );
  }
});

/**
 * @route POST /api/revenue/booster/activate
 * @desc Consume XP booster entitlement and activate a server-side booster window.
 */
router.post('/booster/activate', requireMonetizationAuth, async (req, res) => {
  if (!ensurePg(res)) return;

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');
  }

  const entitlementId = typeof req.body?.entitlementId === 'string' ? req.body.entitlementId.trim() : null;

  try {
    const mutation = await executeIdempotentMutation({
      scope: 'revenue.booster.activate',
      idempotencyKey,
      requestPayload: { userId: req.user.id, entitlementId },
      actorUserId: req.user.id,
      targetUserId: req.user.id,
      entityType: 'xp_booster',
      eventType: 'revenue.booster.activate',
      requestId: req.header('x-request-id') || null,
      mutationFn: async () => {
        let entitlement = null;
        if (entitlementId) {
          entitlement = await dataAccess.getEntitlementById(entitlementId);
          if (!entitlement || entitlement.user_id !== req.user.id || entitlement.entitlement_type !== 'xp_booster') {
            const err = new Error('XP booster entitlement not found');
            err.code = 'ENTITLEMENT_NOT_FOUND';
            throw err;
          }
        } else {
          entitlement = await dataAccess.getActiveEntitlementByType(req.user.id, 'xp_booster');
        }

        if (!entitlement) {
          const err = new Error('No XP booster available');
          err.code = 'NO_XP_BOOSTER_AVAILABLE';
          throw err;
        }

        const now = new Date();
        if (entitlement.status !== 'active' || (entitlement.expires_at && new Date(entitlement.expires_at) <= now)) {
          const err = new Error('Entitlement is not active');
          err.code = 'ENTITLEMENT_NOT_ACTIVE';
          throw err;
        }

        const remaining = Number(entitlement.quantity || 0) - Number(entitlement.consumed_quantity || 0);
        if (remaining <= 0) {
          const err = new Error('Entitlement already consumed');
          err.code = 'ENTITLEMENT_ALREADY_CONSUMED';
          throw err;
        }

        const boosterMultiplier = Number(entitlement.metadata?.multiplier || 1.25);
        const boosterDuration = toPositiveInt(entitlement.metadata?.durationMinutes || 60, 'durationMinutes', 5, 1440);

        if (!Number.isFinite(boosterMultiplier) || boosterMultiplier < 1 || boosterMultiplier > 5) {
          const err = new Error('multiplier must be between 1.0 and 5.0');
          err.code = 'INVALID_MULTIPLIER';
          throw err;
        }

        const activeBoosters = await dataAccess.listActiveXpBoosterActivations(req.user.id, now.toISOString());
        if (activeBoosters.length >= MAX_ACTIVE_BOOSTERS) {
          const err = new Error('Maximum concurrent boosters reached');
          err.code = 'BOOSTER_ACTIVE_CAP_REACHED';
          throw err;
        }

        const stacked = activeBoosters.reduce((sum, row) => sum + Number(row.multiplier || 1), 0) + boosterMultiplier;
        if (stacked > MAX_STACKED_MULTIPLIER) {
          const err = new Error('Booster stack cap exceeded');
          err.code = 'BOOSTER_STACK_CAP_EXCEEDED';
          throw err;
        }

        await postgres.query('BEGIN');
        try {
          const updatedEntitlement = await dataAccess.consumeEntitlementQuantity({
            entitlementId: entitlement.id,
            quantity: 1
          });

          if (!updatedEntitlement) {
            const err = new Error('Entitlement already consumed');
            err.code = 'ENTITLEMENT_ALREADY_CONSUMED';
            throw err;
          }

          const startsAt = new Date();
          const endsAt = new Date(startsAt.getTime() + boosterDuration * 60 * 1000);

          const activation = await dataAccess.createXpBoosterActivation({
            id: makeId('xp_boost'),
            userId: req.user.id,
            entitlementId: entitlement.id,
            multiplier: boosterMultiplier,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            idempotencyKey,
            metadata: {
              source: 'revenue_api_5_3',
              stackCap: MAX_STACKED_MULTIPLIER,
              activeCap: MAX_ACTIVE_BOOSTERS
            }
          });

          await dataAccess.createEntitlementConsumption({
            id: makeId('ent_consume'),
            entitlementId: entitlement.id,
            userId: req.user.id,
            quantity: 1,
            idempotencyKey,
            metadata: {
              reason: 'xp_booster_activation',
              activationId: activation.id,
              startsAt: activation.starts_at,
              endsAt: activation.ends_at
            }
          });

          await postgres.query('COMMIT');

          const effectiveMultiplier = await dataAccess.getEffectiveXpBoosterMultiplier(req.user.id);

          return {
            success: true,
            activation,
            effectiveMultiplier,
            resourceType: 'xp_booster_activation',
            resourceId: activation.id
          };
        } catch (error) {
          await postgres.query('ROLLBACK');
          throw error;
        }
      }
    });

    return res.status(mutation.replayed ? 200 : 201).json({ success: true, ...mutation.responseBody, replayed: mutation.replayed });
  } catch (error) {
    const errorMessages = {
      ENTITLEMENT_NOT_FOUND: 'XP booster entitlement not found',
      NO_XP_BOOSTER_AVAILABLE: 'No XP booster available',
      ENTITLEMENT_NOT_ACTIVE: 'Entitlement is not active',
      ENTITLEMENT_ALREADY_CONSUMED: 'Entitlement already consumed',
      INVALID_MULTIPLIER: 'multiplier must be between 1.0 and 5.0',
      BOOSTER_ACTIVE_CAP_REACHED: 'Maximum concurrent boosters reached',
      BOOSTER_STACK_CAP_EXCEEDED: 'Booster stack cap exceeded'
    };
    return failInternal(
      res,
      buildStatusByCode(error.code),
      error.code || 'BOOSTER_ACTIVATION_FAILED',
      errorMessages[error.code] || 'Unable to activate XP booster',
      error,
      { userId: req.user?.id || null, entitlementId: entitlementId || null }
    );
  }
});

/**
 * @route GET /api/revenue/booster/multiplier
 * @desc Get current server-side effective XP multiplier.
 */
router.get('/booster/multiplier', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  try {
    const userId = req.user.id;
    const active = await dataAccess.listActiveXpBoosterActivations(userId);
    const effective = await dataAccess.getEffectiveXpBoosterMultiplier(userId);

    return res.json({
      success: true,
      effectiveMultiplier: effective,
      activeCount: active.length,
      active
    });
  } catch (error) {
    return failInternal(res, 500, 'BOOSTER_MULTIPLIER_FETCH_FAILED', 'Unable to load booster multiplier right now', error, {
      userId: req.user?.id || null
    });
  }
});

/**
 * @route GET /api/revenue/season-pass/coverage/:year
 * @desc Verify annual season pass entitlement for a given year.
 */
router.get('/season-pass/coverage/:year', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  try {
    const year = toPositiveInt(req.params.year, 'coverageYear', 2020, 2200);
    const coverage = await dataAccess.getSeasonPassCoverage(req.user.id, year);

    return res.json({
      success: true,
      year,
      covered: !!coverage,
      coverage
    });
  } catch (error) {
    const errorMessages = {
      INVALID_COVERAGEYEAR: 'coverageYear must be between 2020 and 2200'
    };
    return failInternal(
      res,
      buildStatusByCode(error.code),
      error.code || 'SEASON_PASS_COVERAGE_FETCH_FAILED',
      errorMessages[error.code] || 'Unable to load season pass coverage',
      error,
      { userId: req.user?.id || null, year: req.params?.year || null }
    );
  }
});

module.exports = router;
