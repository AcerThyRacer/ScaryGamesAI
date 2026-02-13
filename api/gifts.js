/**
 * Gifts API Routes (5.1)
 * Friend item gifting.
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireMonetizationAuth } = require('../middleware/auth');
const postgres = require('../models/postgres');
const { executeIdempotentMutation, makeId } = require('../services/economyMutationService');

const MAX_DAILY_ITEM_GIFTS = 20;
const MAX_ITEM_GIFTS_PER_MINUTE = 6;

function getIdempotencyKey(req) {
  return req.header('idempotency-key')
    || req.header('x-idempotency-key')
    || req.body?.idempotencyKey
    || null;
}

function fail(res, status, code, message, details = null) {
  return res.status(status).json({ success: false, error: { code, message, details } });
}

function logGiftsError(error, metadata = {}) {
  console.error('[api/gifts] request failed', {
    code: error?.code || null,
    message: error?.message || String(error),
    stack: error?.stack || null,
    ...metadata
  });
}

function failInternal(res, status, code, publicMessage, error, metadata = {}) {
  logGiftsError(error, { status, code, ...metadata });
  return fail(res, status, code, publicMessage);
}

function ensurePg(res) {
  if (!postgres.isEnabled()) {
    fail(res, 503, 'PG_REQUIRED', 'This endpoint requires PostgreSQL-backed economy mode');
    return false;
  }
  return true;
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

router.get('/sent', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  try {
    const result = await postgres.query(
      `
        SELECT id, recipient_user_id AS "recipientUserId", gift_type AS "giftType", item_key AS "itemKey",
               status, message, created_at AS "createdAt", delivered_at AS "deliveredAt"
        FROM gift_transactions
        WHERE sender_user_id = $1
        ORDER BY created_at DESC
        LIMIT 100
      `,
      [req.user.id]
    );

    return res.json({ success: true, gifts: result.rows });
  } catch (error) {
    return failInternal(res, 500, 'GIFTS_SENT_FETCH_FAILED', 'Unable to load sent gifts right now', error, {
      userId: req.user?.id || null
    });
  }
});

router.get('/received', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  try {
    const result = await postgres.query(
      `
        SELECT id, sender_user_id AS "senderUserId", gift_type AS "giftType", item_key AS "itemKey",
               subscription_tier AS "subscriptionTier", subscription_billing_cycle AS "subscriptionBillingCycle",
               status, message, created_at AS "createdAt", delivered_at AS "deliveredAt"
        FROM gift_transactions
        WHERE recipient_user_id = $1
        ORDER BY created_at DESC
        LIMIT 100
      `,
      [req.user.id]
    );

    return res.json({ success: true, gifts: result.rows });
  } catch (error) {
    return failInternal(res, 500, 'GIFTS_RECEIVED_FETCH_FAILED', 'Unable to load received gifts right now', error, {
      userId: req.user?.id || null
    });
  }
});

router.post('/item', requireMonetizationAuth, async (req, res) => {
  if (!ensurePg(res)) return;

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey) return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');

  const recipientUserId = typeof req.body?.recipientUserId === 'string' ? req.body.recipientUserId.trim() : '';
  const itemKey = typeof req.body?.itemKey === 'string' ? req.body.itemKey.trim() : '';
  const message = typeof req.body?.message === 'string' ? req.body.message.trim().slice(0, 240) : null;

  if (!recipientUserId) return fail(res, 400, 'INVALID_RECIPIENT', 'recipientUserId is required');
  if (!itemKey) return fail(res, 400, 'INVALID_ITEM_KEY', 'itemKey is required');
  if (recipientUserId === req.user.id) return fail(res, 400, 'SELF_GIFT_FORBIDDEN', 'Cannot gift to yourself');

  try {
    const mutation = await executeIdempotentMutation({
      scope: 'gifts.item.send',
      idempotencyKey,
      requestPayload: { senderUserId: req.user.id, recipientUserId, itemKey, message },
      actorUserId: req.user.id,
      targetUserId: recipientUserId,
      entityType: 'gift_transaction',
      eventType: 'gift_item_send',
      requestId: req.header('x-request-id') || null,
      mutationFn: async () => {
        const isFriend = await ensureFriends(req.user.id, recipientUserId);
        if (!isFriend) {
          const err = new Error('Recipient must be a friend');
          err.code = 'FRIENDSHIP_REQUIRED';
          throw err;
        }

        const daily = await postgres.query(
          `
            SELECT COUNT(1)::int AS c
            FROM gift_transactions
            WHERE sender_user_id = $1
              AND gift_type = 'item'
              AND created_at >= NOW() - INTERVAL '1 day'
          `,
          [req.user.id]
        );

        if ((daily.rows[0]?.c || 0) >= MAX_DAILY_ITEM_GIFTS) {
          const err = new Error('Daily gift cap reached');
          err.code = 'DAILY_GIFT_CAP_REACHED';
          throw err;
        }

        const minuteVelocity = await postgres.query(
          `
            SELECT COUNT(1)::int AS c
            FROM gift_transactions
            WHERE sender_user_id = $1
              AND gift_type = 'item'
              AND created_at >= NOW() - INTERVAL '1 minute'
          `,
          [req.user.id]
        );

        if ((minuteVelocity.rows[0]?.c || 0) >= MAX_ITEM_GIFTS_PER_MINUTE) {
          const err = new Error('Item gifting rate limit exceeded');
          err.code = 'ITEM_GIFT_RATE_LIMITED';
          throw err;
        }

        await postgres.query('BEGIN');
        try {
          const senderResult = await postgres.query(
            'SELECT id, inventory FROM users WHERE id = $1 LIMIT 1 FOR UPDATE',
            [req.user.id]
          );
          const recipientResult = await postgres.query(
            'SELECT id, inventory FROM users WHERE id = $1 LIMIT 1 FOR UPDATE',
            [recipientUserId]
          );

          const sender = senderResult.rows[0];
          const recipient = recipientResult.rows[0];

          if (!sender || !recipient) {
            const err = new Error('Sender or recipient not found');
            err.code = 'USER_NOT_FOUND';
            throw err;
          }

          const senderInventory = Array.isArray(sender.inventory) ? [...sender.inventory] : [];
          const itemIndex = senderInventory.indexOf(itemKey);
          if (itemIndex < 0) {
            const err = new Error('Item not owned by sender');
            err.code = 'ITEM_NOT_OWNED';
            throw err;
          }

          senderInventory.splice(itemIndex, 1);
          const recipientInventory = Array.isArray(recipient.inventory) ? [...recipient.inventory] : [];
          recipientInventory.push(itemKey);

          await postgres.query(
            'UPDATE users SET inventory = $2::jsonb, updated_at = NOW() WHERE id = $1',
            [sender.id, JSON.stringify(senderInventory)]
          );
          await postgres.query(
            'UPDATE users SET inventory = $2::jsonb, updated_at = NOW() WHERE id = $1',
            [recipient.id, JSON.stringify(recipientInventory)]
          );

          const giftId = makeId('gift');
          await postgres.query(
            `
              INSERT INTO gift_transactions (
                id, gift_type, sender_user_id, recipient_user_id, item_key, status,
                message, metadata, delivered_at, created_at, updated_at
              )
              VALUES ($1, 'item', $2, $3, $4, 'delivered', $5, '{}'::jsonb, NOW(), NOW(), NOW())
            `,
            [giftId, sender.id, recipient.id, itemKey, message]
          );

          await postgres.query('COMMIT');

          return {
            success: true,
            giftId,
            recipientUserId,
            itemKey,
            status: 'delivered',
            resourceType: 'gift_transaction',
            resourceId: giftId
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
      FRIENDSHIP_REQUIRED: 403,
      DAILY_GIFT_CAP_REACHED: 429,
      ITEM_GIFT_RATE_LIMITED: 429,
      USER_NOT_FOUND: 404,
      ITEM_NOT_OWNED: 409
    };

    const errorMessages = {
      FRIENDSHIP_REQUIRED: 'Recipient must be a friend',
      DAILY_GIFT_CAP_REACHED: 'Daily gift cap reached',
      ITEM_GIFT_RATE_LIMITED: 'Item gifting rate limit exceeded',
      USER_NOT_FOUND: 'Sender or recipient not found',
      ITEM_NOT_OWNED: 'Item not owned by sender'
    };

    return failInternal(
      res,
      statusByCode[error.code] || 400,
      error.code || 'GIFT_ITEM_FAILED',
      errorMessages[error.code] || 'Unable to send gift item',
      error,
      { userId: req.user?.id || null, recipientUserId, itemKey }
    );
  }
});

module.exports = router;