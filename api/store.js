/**
 * Store API Routes (5.1)
 * Seasonal catalog + purchases.
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireMonetizationAuth } = require('../middleware/auth');
const postgres = require('../models/postgres');
const observability = require('../services/observability');
const { executeIdempotentMutation, appendAuditEvent, makeId } = require('../services/economyMutationService');

const MAX_PURCHASE_QTY = 10;

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

function logStoreError(error, metadata = {}) {
  console.error('[api/store] request failed', {
    code: error?.code || null,
    message: error?.message || String(error),
    stack: error?.stack || null,
    ...metadata
  });
}

function failInternal(res, status, code, publicMessage, error, metadata = {}) {
  logStoreError(error, { status, code, ...metadata });
  observability.recordSecurityEvent('store.error', {
    status,
    code,
    userId: metadata?.userId || null,
    itemKey: metadata?.itemKey || null,
    message: error?.message || null
  }, {
    force: status >= 500
  });
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
 * @route GET /api/store/seasonal
 * @desc Get active seasonal store catalog
 */
router.get('/seasonal', authMiddleware, async (req, res) => {
  const startedAt = Date.now();
  if (!ensurePg(res)) {
    observability.recordPerfEvent('store.seasonal.fetch', {
      durationMs: Date.now() - startedAt,
      skipped: true,
      reason: 'PG_REQUIRED',
      userId: req?.user?.id || null
    });
    return;
  }

  try {
    const sql = `
      SELECT id, item_key AS "itemKey", name, description, price_coins AS "priceCoins",
             starts_at AS "startsAt", ends_at AS "endsAt", max_supply AS "maxSupply",
             claimed_count AS "claimedCount", metadata
      FROM seasonal_store_items
      WHERE is_active = TRUE
        AND starts_at <= NOW()
        AND ends_at >= NOW()
      ORDER BY ends_at ASC, created_at DESC
    `;

    const result = await postgres.query(sql);
    observability.recordPerfEvent('store.seasonal.fetch', {
      durationMs: Date.now() - startedAt,
      itemCount: result.rows.length,
      userId: req?.user?.id || null
    });
    return res.json({ success: true, items: result.rows });
  } catch (error) {
    observability.recordPerfEvent('store.seasonal.fetch', {
      durationMs: Date.now() - startedAt,
      failed: true,
      userId: req?.user?.id || null
    }, {
      force: true
    });
    return failInternal(res, 500, 'STORE_SEASONAL_FETCH_FAILED', 'Unable to load seasonal store right now', error);
  }
});

/**
 * @route POST /api/store/seasonal/purchase
 * @desc Purchase limited-time seasonal item
 */
router.post('/seasonal/purchase', requireMonetizationAuth, async (req, res) => {
  const startedAt = Date.now();
  if (!ensurePg(res)) {
    observability.recordPerfEvent('store.seasonal.purchase', {
      durationMs: Date.now() - startedAt,
      skipped: true,
      reason: 'PG_REQUIRED',
      userId: req?.user?.id || null
    });
    return;
  }

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    observability.recordSecurityEvent('store.purchase.invalid_request', {
      code: 'IDEMPOTENCY_KEY_REQUIRED',
      userId: req?.user?.id || null,
      path: req?.path || null
    });
    return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');
  }

  const itemKey = typeof req.body?.itemKey === 'string' ? req.body.itemKey.trim() : '';
  const quantity = Number.isInteger(req.body?.quantity) ? req.body.quantity : 1;

  if (!itemKey) {
    observability.recordSecurityEvent('store.purchase.invalid_request', {
      code: 'INVALID_ITEM_KEY',
      userId: req?.user?.id || null
    });
    return fail(res, 400, 'INVALID_ITEM_KEY', 'itemKey is required');
  }
  if (quantity <= 0 || quantity > MAX_PURCHASE_QTY) {
    observability.recordSecurityEvent('store.purchase.invalid_request', {
      code: 'INVALID_QUANTITY',
      userId: req?.user?.id || null,
      quantity
    });
    return fail(res, 400, 'INVALID_QUANTITY', `quantity must be between 1 and ${MAX_PURCHASE_QTY}`);
  }

  try {
    const mutation = await executeIdempotentMutation({
      scope: 'store.seasonal.purchase',
      idempotencyKey,
      requestPayload: { userId: req.user.id, itemKey, quantity },
      actorUserId: req.user.id,
      targetUserId: req.user.id,
      entityType: 'seasonal_store_item',
      eventType: 'seasonal_purchase',
      requestId: req.header('x-request-id') || null,
      perfChannel: 'store.seasonal.purchase',
      mutationFn: async () => {
        const velocity = await postgres.query(
          `
            SELECT COUNT(1)::int AS c
            FROM economy_audit_log
            WHERE actor_user_id = $1
              AND event_type = 'seasonal_purchase.succeeded'
              AND created_at >= NOW() - INTERVAL '1 minute'
          `,
          [req.user.id]
        );
        if ((velocity.rows[0]?.c || 0) >= 10) {
          const err = new Error('Purchase rate limit exceeded');
          err.code = 'PURCHASE_RATE_LIMITED';
          throw err;
        }

        await postgres.query('BEGIN');
        try {
          const itemUpdateResult = await postgres.query(
            `
              UPDATE seasonal_store_items
              SET claimed_count = claimed_count + $2,
                  updated_at = NOW()
              WHERE item_key = $1
                AND is_active = TRUE
                AND starts_at <= NOW()
                AND ends_at >= NOW()
                AND (max_supply IS NULL OR claimed_count + $2 <= max_supply)
              RETURNING id, item_key, name, price_coins
            `,
            [itemKey, quantity]
          );

          const item = itemUpdateResult.rows[0];
          if (!item) {
            const itemStateResult = await postgres.query(
              `
                SELECT item_key, starts_at, ends_at, max_supply, claimed_count
                FROM seasonal_store_items
                WHERE item_key = $1
                  AND is_active = TRUE
                LIMIT 1
              `,
              [itemKey]
            );
            const itemState = itemStateResult.rows[0];
            if (!itemState) {
              const err = new Error('Seasonal item not found');
              err.code = 'SEASONAL_ITEM_NOT_FOUND';
              throw err;
            }

            const now = new Date();
            if (new Date(itemState.starts_at) > now || new Date(itemState.ends_at) < now) {
              const err = new Error('Seasonal item is not currently available');
              err.code = 'SEASONAL_ITEM_UNAVAILABLE';
              throw err;
            }

            const err = new Error('Not enough seasonal supply remaining');
            err.code = 'SEASONAL_SUPPLY_EXHAUSTED';
            throw err;
          }

          const totalCost = item.price_coins * quantity;
          const purchasedItems = new Array(quantity).fill(item.item_key);
          const userUpdateResult = await postgres.query(
            `
              UPDATE users
              SET horror_coins = horror_coins - $2,
                  inventory = COALESCE(inventory, '[]'::jsonb) || $3::jsonb,
                  updated_at = NOW()
              WHERE id = $1
                AND horror_coins >= $2
              RETURNING horror_coins
            `,
            [req.user.id, totalCost, JSON.stringify(purchasedItems)]
          );

          if (!userUpdateResult.rows[0]) {
            const userExistenceResult = await postgres.query(
              'SELECT id FROM users WHERE id = $1 LIMIT 1',
              [req.user.id]
            );
            if (!userExistenceResult.rows[0]) {
              const err = new Error('User not found');
              err.code = 'USER_NOT_FOUND';
              throw err;
            }
            const err = new Error('Insufficient coins');
            err.code = 'INSUFFICIENT_COINS';
            throw err;
          }

          const remainingCoins = Number(userUpdateResult.rows[0].horror_coins || 0);

          const entitlement = await postgres.query(
            `
              INSERT INTO entitlements (
                id, user_id, entitlement_type, status, quantity, consumed_quantity,
                granted_reason, metadata, starts_at, created_at, updated_at
              )
              VALUES ($1, $2, 'item', 'active', $3, 0, 'seasonal_purchase', $4::jsonb, NOW(), NOW(), NOW())
              RETURNING id
            `,
            [
              makeId('ent'),
              req.user.id,
              quantity,
              JSON.stringify({ itemKey: item.item_key, source: 'seasonal_store', unitPrice: item.price_coins })
            ]
          );

          await appendAuditEvent({
            actorUserId: req.user.id,
            targetUserId: req.user.id,
            entityType: 'currency',
            entityId: req.user.id,
            eventType: 'currency.debit',
            requestId: req.header('x-request-id') || null,
            idempotencyKey,
            metadata: {
              reason: 'seasonal_purchase',
              itemKey: item.item_key,
              quantity,
              amount: totalCost
            }
          });

          await postgres.query('COMMIT');

          return {
            success: true,
            replayed: false,
            itemKey: item.item_key,
            quantity,
            spentCoins: totalCost,
            remainingCoins,
            entitlementId: entitlement.rows[0]?.id || null,
            resourceType: 'seasonal_purchase',
            resourceId: `${req.user.id}:${item.item_key}`
          };
        } catch (error) {
          await postgres.query('ROLLBACK');
          throw error;
        }
      }
    });

    const code = mutation.replayed ? 200 : 201;
    observability.recordPerfEvent('store.seasonal.purchase', {
      durationMs: Date.now() - startedAt,
      replayed: mutation.replayed,
      statusCode: code,
      userId: req?.user?.id || null,
      itemKey,
      quantity
    });
    return res.status(code).json({ success: true, ...mutation.responseBody, replayed: mutation.replayed });
  } catch (error) {
    if (error.code === 'IDEMPOTENCY_PAYLOAD_MISMATCH') {
      return fail(res, 409, error.code, 'Idempotency key already used with different payload');
    }
    if (error.code === 'IDEMPOTENCY_IN_PROGRESS') {
      return fail(res, 409, error.code, 'Request with this idempotency key is currently in progress');
    }

    const statusByCode = {
      SEASONAL_ITEM_NOT_FOUND: 404,
      SEASONAL_ITEM_UNAVAILABLE: 409,
      SEASONAL_SUPPLY_EXHAUSTED: 409,
      USER_NOT_FOUND: 404,
      INSUFFICIENT_COINS: 409,
      PURCHASE_RATE_LIMITED: 429
    };

    const errorMessages = {
      SEASONAL_ITEM_NOT_FOUND: 'Seasonal item not found',
      SEASONAL_ITEM_UNAVAILABLE: 'Seasonal item is not currently available',
      SEASONAL_SUPPLY_EXHAUSTED: 'Not enough seasonal supply remaining',
      USER_NOT_FOUND: 'User not found',
      INSUFFICIENT_COINS: 'Insufficient coins',
      PURCHASE_RATE_LIMITED: 'Purchase rate limit exceeded'
    };

    const statusCode = statusByCode[error.code] || 400;
    observability.recordPerfEvent('store.seasonal.purchase', {
      durationMs: Date.now() - startedAt,
      failed: true,
      statusCode,
      userId: req?.user?.id || null,
      itemKey,
      quantity,
      code: error.code || 'SEASONAL_PURCHASE_FAILED'
    }, {
      force: statusCode >= 500
    });

    if (statusCode === 429 || statusCode === 409) {
      observability.recordSecurityEvent('store.purchase.guard_blocked', {
        code: error.code || 'SEASONAL_PURCHASE_FAILED',
        userId: req?.user?.id || null,
        itemKey,
        quantity
      }, {
        force: error.code === 'PURCHASE_RATE_LIMITED'
      });
    }

    return failInternal(
      res,
      statusCode,
      error.code || 'SEASONAL_PURCHASE_FAILED',
      errorMessages[error.code] || 'Unable to complete seasonal purchase',
      error,
      { userId: req.user?.id || null, itemKey }
    );
  }
});

module.exports = router;