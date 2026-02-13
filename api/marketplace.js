/**
 * Marketplace API Routes (5.1)
 * P2P listings with server-side tax.
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireMonetizationAuth } = require('../middleware/auth');
const postgres = require('../models/postgres');
const { executeIdempotentMutation, appendAuditEvent, makeId } = require('../services/economyMutationService');

const MARKETPLACE_TAX_BPS = 1000; // 10%

function getIdempotencyKey(req) {
  return req.header('idempotency-key')
    || req.header('x-idempotency-key')
    || req.body?.idempotencyKey
    || null;
}

function fail(res, status, code, message, details = null) {
  return res.status(status).json({ success: false, error: { code, message, details } });
}

function logMarketplaceError(error, metadata = {}) {
  console.error('[api/marketplace] request failed', {
    code: error?.code || null,
    message: error?.message || String(error),
    stack: error?.stack || null,
    ...metadata
  });
}

function failInternal(res, status, code, publicMessage, error, metadata = {}) {
  logMarketplaceError(error, { status, code, ...metadata });
  return fail(res, status, code, publicMessage);
}

function ensurePg(res) {
  if (!postgres.isEnabled()) {
    fail(res, 503, 'PG_REQUIRED', 'This endpoint requires PostgreSQL-backed economy mode');
    return false;
  }
  return true;
}

function calcTax(priceCoins) {
  return Math.floor((priceCoins * MARKETPLACE_TAX_BPS) / 10000);
}

async function enforceListingVelocity(userId) {
  const result = await postgres.query(
    `
      SELECT COUNT(1)::int AS c
      FROM marketplace_listings
      WHERE seller_user_id = $1
        AND created_at >= NOW() - INTERVAL '1 minute'
    `,
    [userId]
  );

  if ((result.rows[0]?.c || 0) >= 5) {
    const err = new Error('Listing rate limit exceeded');
    err.code = 'LISTING_RATE_LIMITED';
    throw err;
  }
}

router.get('/listings', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  try {
    const parsedLimit = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 100)) : 50;

    const result = await postgres.query(
      `
        SELECT id, seller_user_id AS "sellerUserId", item_key AS "itemKey", price_coins AS "priceCoins",
               tax_amount AS "taxAmount", seller_net_amount AS "sellerNetAmount", status,
               created_at AS "createdAt", sold_at AS "soldAt"
        FROM marketplace_listings
        WHERE status = 'active'
        ORDER BY created_at DESC
        LIMIT $1
      `,
      [limit]
    );

    return res.json({ success: true, taxBps: MARKETPLACE_TAX_BPS, listings: result.rows });
  } catch (error) {
    return failInternal(res, 500, 'MARKETPLACE_FETCH_FAILED', 'Unable to load marketplace listings right now', error, {
      userId: req.user?.id || null
    });
  }
});

router.post('/listings', requireMonetizationAuth, async (req, res) => {
  if (!ensurePg(res)) return;

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey) {
    return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');
  }

  const itemKey = typeof req.body?.itemKey === 'string' ? req.body.itemKey.trim() : '';
  const priceCoins = Number.isInteger(req.body?.priceCoins) ? req.body.priceCoins : 0;

  if (!itemKey) return fail(res, 400, 'INVALID_ITEM_KEY', 'itemKey is required');
  if (priceCoins <= 0 || priceCoins > 500000) return fail(res, 400, 'INVALID_PRICE', 'priceCoins must be between 1 and 500000');

  try {
    const mutation = await executeIdempotentMutation({
      scope: 'marketplace.listing.create',
      idempotencyKey,
      requestPayload: { userId: req.user.id, itemKey, priceCoins },
      actorUserId: req.user.id,
      entityType: 'marketplace_listing',
      eventType: 'marketplace_listing_create',
      requestId: req.header('x-request-id') || null,
      perfChannel: 'marketplace.listing.create',
      mutationFn: async () => {
        await enforceListingVelocity(req.user.id);

        await postgres.query('BEGIN');
        try {
          const userResult = await postgres.query(
            'SELECT id, inventory FROM users WHERE id = $1 LIMIT 1 FOR UPDATE',
            [req.user.id]
          );
          const user = userResult.rows[0];
          if (!user) {
            const err = new Error('User not found');
            err.code = 'USER_NOT_FOUND';
            throw err;
          }

          const inventory = Array.isArray(user.inventory) ? [...user.inventory] : [];
          const idx = inventory.indexOf(itemKey);
          if (idx < 0) {
            const err = new Error('Item not owned by seller');
            err.code = 'ITEM_NOT_OWNED';
            throw err;
          }

          inventory.splice(idx, 1);
          await postgres.query(
            'UPDATE users SET inventory = $2::jsonb, updated_at = NOW() WHERE id = $1',
            [req.user.id, JSON.stringify(inventory)]
          );

          const listingId = makeId('ml');
          const taxAmount = calcTax(priceCoins);
          const sellerNetAmount = priceCoins - taxAmount;

          await postgres.query(
            `
              INSERT INTO marketplace_listings (
                id, seller_user_id, item_key, price_coins, tax_amount, seller_net_amount,
                status, metadata, created_at, updated_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, 'active', '{}'::jsonb, NOW(), NOW())
            `,
            [listingId, req.user.id, itemKey, priceCoins, taxAmount, sellerNetAmount]
          );

          await postgres.query('COMMIT');
          return {
            success: true,
            listingId,
            itemKey,
            priceCoins,
            taxAmount,
            sellerNetAmount,
            resourceType: 'marketplace_listing',
            resourceId: listingId
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
      USER_NOT_FOUND: 404,
      ITEM_NOT_OWNED: 409,
      LISTING_RATE_LIMITED: 429
    };

    const errorMessages = {
      USER_NOT_FOUND: 'User not found',
      ITEM_NOT_OWNED: 'Item not owned by seller',
      LISTING_RATE_LIMITED: 'Listing rate limit exceeded'
    };

    return failInternal(
      res,
      statusByCode[error.code] || 400,
      error.code || 'MARKETPLACE_CREATE_FAILED',
      errorMessages[error.code] || 'Unable to create marketplace listing',
      error,
      { userId: req.user?.id || null, itemKey, priceCoins }
    );
  }
});

router.post('/listings/:listingId/buy', requireMonetizationAuth, async (req, res) => {
  if (!ensurePg(res)) return;

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey) {
    return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');
  }

  const listingId = String(req.params.listingId || '').trim();
  if (!listingId) return fail(res, 400, 'INVALID_LISTING_ID', 'listingId is required');

  try {
    const mutation = await executeIdempotentMutation({
      scope: 'marketplace.listing.buy',
      idempotencyKey,
      requestPayload: { buyerUserId: req.user.id, listingId },
      actorUserId: req.user.id,
      entityType: 'marketplace_listing',
      entityId: listingId,
      eventType: 'marketplace_listing_buy',
      requestId: req.header('x-request-id') || null,
      perfChannel: 'marketplace.listing.buy',
      mutationFn: async () => {
        const buyVelocity = await postgres.query(
          `
            SELECT COUNT(1)::int AS c
            FROM economy_audit_log
            WHERE actor_user_id = $1
              AND event_type = 'marketplace_listing_buy.succeeded'
              AND created_at >= NOW() - INTERVAL '1 minute'
          `,
          [req.user.id]
        );

        if ((buyVelocity.rows[0]?.c || 0) >= 8) {
          const err = new Error('Marketplace buy rate limit exceeded');
          err.code = 'MARKETPLACE_BUY_RATE_LIMITED';
          throw err;
        }

        await postgres.query('BEGIN');
        try {
          const listingResult = await postgres.query(
            `
              SELECT id, seller_user_id, buyer_user_id, item_key, price_coins, tax_amount, seller_net_amount, status
              FROM marketplace_listings
              WHERE id = $1
              LIMIT 1
              FOR UPDATE
            `,
            [listingId]
          );

          const listing = listingResult.rows[0];
          if (!listing) {
            const err = new Error('Listing not found');
            err.code = 'LISTING_NOT_FOUND';
            throw err;
          }

          if (listing.status !== 'active') {
            const err = new Error('Listing is not active');
            err.code = 'LISTING_NOT_ACTIVE';
            throw err;
          }

          if (listing.seller_user_id === req.user.id) {
            const err = new Error('Cannot buy your own listing');
            err.code = 'SELF_PURCHASE_FORBIDDEN';
            throw err;
          }

          const buyerInventoryPatch = JSON.stringify([listing.item_key]);
          const buyerUpdate = await postgres.query(
            `
              UPDATE users
              SET horror_coins = horror_coins - $2,
                  inventory = COALESCE(inventory, '[]'::jsonb) || $3::jsonb,
                  updated_at = NOW()
              WHERE id = $1
                AND horror_coins >= $2
              RETURNING id
            `,
            [req.user.id, listing.price_coins, buyerInventoryPatch]
          );

          if (!buyerUpdate.rows[0]) {
            const buyerExists = await postgres.query('SELECT id FROM users WHERE id = $1 LIMIT 1', [req.user.id]);
            if (!buyerExists.rows[0]) {
              const err = new Error('Buyer or seller not found');
              err.code = 'USER_NOT_FOUND';
              throw err;
            }
            const err = new Error('Insufficient coins');
            err.code = 'INSUFFICIENT_COINS';
            throw err;
          }

          const sellerUpdate = await postgres.query(
            `
              UPDATE users
              SET horror_coins = horror_coins + $2,
                  updated_at = NOW()
              WHERE id = $1
              RETURNING id
            `,
            [listing.seller_user_id, listing.seller_net_amount]
          );

          if (!sellerUpdate.rows[0]) {
            const err = new Error('Buyer or seller not found');
            err.code = 'USER_NOT_FOUND';
            throw err;
          }

          await postgres.query(
            `
              UPDATE marketplace_listings
              SET status = 'sold',
                  buyer_user_id = $2,
                  sold_at = NOW(),
                  updated_at = NOW()
              WHERE id = $1
            `,
            [listing.id, req.user.id]
          );

          await appendAuditEvent({
            actorUserId: req.user.id,
            targetUserId: listing.seller_user_id,
            entityType: 'marketplace_listing',
            entityId: listing.id,
            eventType: 'marketplace_tax.charged',
            requestId: req.header('x-request-id') || null,
            idempotencyKey,
            metadata: {
              itemKey: listing.item_key,
              priceCoins: listing.price_coins,
              taxAmount: listing.tax_amount,
              sellerNetAmount: listing.seller_net_amount
            }
          });

          await postgres.query('COMMIT');

          return {
            success: true,
            listingId: listing.id,
            itemKey: listing.item_key,
            spentCoins: listing.price_coins,
            taxAmount: listing.tax_amount,
            sellerNetAmount: listing.seller_net_amount,
            resourceType: 'marketplace_listing',
            resourceId: listing.id
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
      LISTING_NOT_FOUND: 404,
      LISTING_NOT_ACTIVE: 409,
      SELF_PURCHASE_FORBIDDEN: 403,
      USER_NOT_FOUND: 404,
      INSUFFICIENT_COINS: 409,
      MARKETPLACE_BUY_RATE_LIMITED: 429
    };

    const errorMessages = {
      LISTING_NOT_FOUND: 'Listing not found',
      LISTING_NOT_ACTIVE: 'Listing is not active',
      SELF_PURCHASE_FORBIDDEN: 'Cannot buy your own listing',
      USER_NOT_FOUND: 'Buyer or seller not found',
      INSUFFICIENT_COINS: 'Insufficient coins',
      MARKETPLACE_BUY_RATE_LIMITED: 'Marketplace buy rate limit exceeded'
    };

    return failInternal(
      res,
      statusByCode[error.code] || 400,
      error.code || 'MARKETPLACE_BUY_FAILED',
      errorMessages[error.code] || 'Unable to buy marketplace listing',
      error,
      { userId: req.user?.id || null, listingId }
    );
  }
});

router.post('/listings/:listingId/cancel', requireMonetizationAuth, async (req, res) => {
  if (!ensurePg(res)) return;

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey) {
    return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');
  }

  const listingId = String(req.params.listingId || '').trim();
  if (!listingId) return fail(res, 400, 'INVALID_LISTING_ID', 'listingId is required');

  try {
    const mutation = await executeIdempotentMutation({
      scope: 'marketplace.listing.cancel',
      idempotencyKey,
      requestPayload: { sellerUserId: req.user.id, listingId },
      actorUserId: req.user.id,
      entityType: 'marketplace_listing',
      entityId: listingId,
      eventType: 'marketplace_listing_cancel',
      requestId: req.header('x-request-id') || null,
      perfChannel: 'marketplace.listing.cancel',
      mutationFn: async () => {
        await postgres.query('BEGIN');
        try {
          const listingResult = await postgres.query(
            `
              SELECT id, seller_user_id, item_key, status
              FROM marketplace_listings
              WHERE id = $1
              LIMIT 1
              FOR UPDATE
            `,
            [listingId]
          );

          const listing = listingResult.rows[0];
          if (!listing) {
            const err = new Error('Listing not found');
            err.code = 'LISTING_NOT_FOUND';
            throw err;
          }

          if (listing.seller_user_id !== req.user.id) {
            const err = new Error('Only seller can cancel listing');
            err.code = 'NOT_LISTING_OWNER';
            throw err;
          }

          if (listing.status !== 'active') {
            const err = new Error('Listing is not active');
            err.code = 'LISTING_NOT_ACTIVE';
            throw err;
          }

          const userResult = await postgres.query(
            'SELECT id, inventory FROM users WHERE id = $1 LIMIT 1 FOR UPDATE',
            [req.user.id]
          );
          const user = userResult.rows[0];
          if (!user) {
            const err = new Error('User not found');
            err.code = 'USER_NOT_FOUND';
            throw err;
          }

          const inventory = Array.isArray(user.inventory) ? [...user.inventory] : [];
          inventory.push(listing.item_key);

          await postgres.query(
            'UPDATE users SET inventory = $2::jsonb, updated_at = NOW() WHERE id = $1',
            [req.user.id, JSON.stringify(inventory)]
          );

          await postgres.query(
            `
              UPDATE marketplace_listings
              SET status = 'canceled', canceled_at = NOW(), updated_at = NOW()
              WHERE id = $1
            `,
            [listing.id]
          );

          await postgres.query('COMMIT');

          return {
            success: true,
            listingId: listing.id,
            status: 'canceled',
            itemReturned: listing.item_key,
            resourceType: 'marketplace_listing',
            resourceId: listing.id
          };
        } catch (error) {
          await postgres.query('ROLLBACK');
          throw error;
        }
      }
    });

    return res.status(200).json({ success: true, ...mutation.responseBody, replayed: mutation.replayed });
  } catch (error) {
    if (error.code === 'IDEMPOTENCY_PAYLOAD_MISMATCH') return fail(res, 409, error.code, 'Idempotency key already used with different payload');
    if (error.code === 'IDEMPOTENCY_IN_PROGRESS') return fail(res, 409, error.code, 'Request with this idempotency key is currently in progress');

    const statusByCode = {
      LISTING_NOT_FOUND: 404,
      NOT_LISTING_OWNER: 403,
      LISTING_NOT_ACTIVE: 409,
      USER_NOT_FOUND: 404
    };

    const errorMessages = {
      LISTING_NOT_FOUND: 'Listing not found',
      NOT_LISTING_OWNER: 'Only seller can cancel listing',
      LISTING_NOT_ACTIVE: 'Listing is not active',
      USER_NOT_FOUND: 'User not found'
    };

    return failInternal(
      res,
      statusByCode[error.code] || 400,
      error.code || 'MARKETPLACE_CANCEL_FAILED',
      errorMessages[error.code] || 'Unable to cancel marketplace listing',
      error,
      { userId: req.user?.id || null, listingId }
    );
  }
});

module.exports = router;