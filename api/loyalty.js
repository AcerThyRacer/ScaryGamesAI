/**
 * Loyalty API Routes (5.1)
 * Tier status and claims.
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const postgres = require('../models/postgres');
const { executeIdempotentMutation, appendAuditEvent, makeId } = require('../services/economyMutationService');

const TIER_THRESHOLDS = [
  { tier: 'bronze', min: 0 },
  { tier: 'silver', min: 500 },
  { tier: 'gold', min: 1500 },
  { tier: 'platinum', min: 5000 },
  { tier: 'diamond', min: 10000 },
  { tier: 'obsidian', min: 25000 },
  { tier: 'immortal', min: 50000 }
];

const TIER_BENEFITS = {
  bronze: {
    gemPurchaseBonusPct: 0,
    storeDiscountPct: 0,
    marketplaceAccess: 'standard',
    customTitle: null
  },
  silver: {
    gemPurchaseBonusPct: 0,
    storeDiscountPct: 0,
    marketplaceAccess: 'standard',
    customTitle: null
  },
  gold: {
    gemPurchaseBonusPct: 0,
    storeDiscountPct: 0,
    marketplaceAccess: 'standard',
    customTitle: null
  },
  platinum: {
    gemPurchaseBonusPct: 0,
    storeDiscountPct: 0,
    marketplaceAccess: 'standard',
    customTitle: null
  },
  diamond: {
    gemPurchaseBonusPct: 10,
    storeDiscountPct: 0,
    marketplaceAccess: 'standard',
    customTitle: null
  },
  obsidian: {
    gemPurchaseBonusPct: 10,
    storeDiscountPct: 0,
    marketplaceAccess: 'exclusive',
    customTitle: null
  },
  immortal: {
    gemPurchaseBonusPct: 10,
    storeDiscountPct: 20,
    marketplaceAccess: 'exclusive',
    customTitle: 'Immortal'
  }
};

const REWARD_CATALOG = {
  BRONZE_DAILY: { pointsCost: 100, coins: 50, minTier: 'bronze' },
  SILVER_STASH: { pointsCost: 500, coins: 300, minTier: 'silver' },
  GOLD_STASH: { pointsCost: 1500, coins: 1000, minTier: 'gold' },
  PLATINUM_STASH: { pointsCost: 5000, coins: 4000, minTier: 'platinum' },
  DIAMOND_VAULT: { pointsCost: 10000, coins: 8000, gemDust: 100, minTier: 'diamond' },
  OBSIDIAN_VAULT: {
    pointsCost: 25000,
    coins: 20000,
    gemDust: 400,
    minTier: 'obsidian',
    metadata: { marketplaceAccess: 'exclusive' }
  },
  IMMORTAL_RELIQUARY: {
    pointsCost: 50000,
    coins: 40000,
    gemDust: 1000,
    minTier: 'immortal',
    metadata: { customTitle: 'Immortal' }
  }
};

const TIER_RANK = TIER_THRESHOLDS.reduce((acc, item, index) => {
  acc[item.tier] = index;
  return acc;
}, {});

function getIdempotencyKey(req) {
  return req.header('idempotency-key') || req.header('x-idempotency-key') || req.body?.idempotencyKey || null;
}

function fail(res, status, code, message, details = null) {
  return res.status(status).json({ success: false, error: { code, message, details } });
}

function logLoyaltyError(error, metadata = {}) {
  console.error('[api/loyalty] request failed', {
    code: error?.code || null,
    message: error?.message || String(error),
    stack: error?.stack || null,
    ...metadata
  });
}

function failInternal(res, status, code, publicMessage, error, metadata = {}) {
  logLoyaltyError(error, { status, code, ...metadata });
  return fail(res, status, code, publicMessage);
}

function ensurePg(res) {
  if (!postgres.isEnabled()) {
    fail(res, 503, 'PG_REQUIRED', 'This endpoint requires PostgreSQL-backed economy mode');
    return false;
  }
  return true;
}

function deriveTier(lifetimePoints) {
  const p = Number(lifetimePoints || 0);
  for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i -= 1) {
    if (p >= TIER_THRESHOLDS[i].min) return TIER_THRESHOLDS[i].tier;
  }
  return TIER_THRESHOLDS[0].tier;
}

function getTierBenefits(tier) {
  return TIER_BENEFITS[tier] || TIER_BENEFITS.bronze;
}

function hasTierAccess(currentTier, requiredTier) {
  const currentRank = Number(TIER_RANK[currentTier] || 0);
  const requiredRank = Number(TIER_RANK[requiredTier] || 0);
  return currentRank >= requiredRank;
}

function nextTierInfo(lifetimePoints) {
  const p = Number(lifetimePoints || 0);
  const next = TIER_THRESHOLDS.find((t) => t.min > p);
  if (!next) return null;
  return {
    tier: next.tier,
    pointsRequired: next.min,
    pointsRemaining: Math.max(next.min - p, 0)
  };
}

async function ensureAccount(userId) {
  await postgres.query(
    `
      INSERT INTO loyalty_accounts (id, user_id, points, lifetime_points, tier, metadata, created_at, updated_at)
      VALUES ($1, $2, 0, 0, 'bronze', '{}'::jsonb, NOW(), NOW())
      ON CONFLICT (user_id) DO NOTHING
    `,
    [makeId('loy'), userId]
  );
}

router.get('/status', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  try {
    await ensureAccount(req.user.id);
    const result = await postgres.query(
      `
        SELECT user_id AS "userId", points, lifetime_points AS "lifetimePoints", tier, updated_at AS "updatedAt"
        FROM loyalty_accounts
        WHERE user_id = $1
        LIMIT 1
      `,
      [req.user.id]
    );

    const account = result.rows[0];
    const normalizedTier = deriveTier(account?.lifetimePoints || 0);
    return res.json({
      success: true,
      account: {
        ...account,
        tier: normalizedTier
      },
      nextTier: nextTierInfo(account?.lifetimePoints || 0),
      currentTierBenefits: getTierBenefits(normalizedTier),
      tierBenefits: TIER_BENEFITS,
      rewards: REWARD_CATALOG
    });
  } catch (error) {
    return failInternal(res, 500, 'LOYALTY_STATUS_FAILED', 'Unable to load loyalty status right now', error, {
      userId: req.user?.id || null
    });
  }
});

router.post('/claim', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey) return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');

  const rewardKey = typeof req.body?.rewardKey === 'string' ? req.body.rewardKey.trim().toUpperCase() : '';
  if (!rewardKey || !REWARD_CATALOG[rewardKey]) {
    return fail(res, 400, 'INVALID_REWARD_KEY', 'rewardKey is invalid');
  }

  try {
    const mutation = await executeIdempotentMutation({
      scope: 'loyalty.claim',
      idempotencyKey,
      requestPayload: { userId: req.user.id, rewardKey },
      actorUserId: req.user.id,
      targetUserId: req.user.id,
      entityType: 'loyalty_claim',
      eventType: 'loyalty_claim',
      requestId: req.header('x-request-id') || null,
      mutationFn: async () => {
        const reward = REWARD_CATALOG[rewardKey];

        await postgres.query('BEGIN');
        try {
          await ensureAccount(req.user.id);

          const accountResult = await postgres.query(
            'SELECT id, points, lifetime_points FROM loyalty_accounts WHERE user_id = $1 LIMIT 1 FOR UPDATE',
            [req.user.id]
          );
          const userResult = await postgres.query(
            'SELECT id, horror_coins, gem_dust, title FROM users WHERE id = $1 LIMIT 1 FOR UPDATE',
            [req.user.id]
          );

          const account = accountResult.rows[0];
          const user = userResult.rows[0];

          if (!account || !user) {
            const err = new Error('User loyalty account missing');
            err.code = 'USER_NOT_FOUND';
            throw err;
          }

          const alreadyClaimed = await postgres.query(
            'SELECT id FROM loyalty_claims WHERE user_id = $1 AND reward_key = $2 LIMIT 1',
            [req.user.id, rewardKey]
          );
          if (alreadyClaimed.rows.length > 0) {
            const err = new Error('Reward already claimed');
            err.code = 'REWARD_ALREADY_CLAIMED';
            throw err;
          }

          if (Number(account.points || 0) < reward.pointsCost) {
            const err = new Error('Not enough loyalty points');
            err.code = 'INSUFFICIENT_LOYALTY_POINTS';
            throw err;
          }

          const currentTier = deriveTier(account.lifetime_points);
          if (reward.minTier && !hasTierAccess(currentTier, reward.minTier)) {
            const err = new Error('Reward requires a higher loyalty tier');
            err.code = 'LOYALTY_TIER_REQUIRED';
            throw err;
          }

          const newPoints = Number(account.points || 0) - reward.pointsCost;
          const tier = currentTier;
          const coinsAwarded = Number(reward.coins || 0);
          const gemDustAwarded = Number(reward.gemDust || 0);
          const titleGranted = typeof reward.metadata?.customTitle === 'string'
            ? reward.metadata.customTitle.slice(0, 80)
            : null;

          await postgres.query(
            'UPDATE loyalty_accounts SET points = $2, tier = $3, updated_at = NOW() WHERE user_id = $1',
            [req.user.id, newPoints, tier]
          );

          const nextCoins = Number(user.horror_coins || 0) + coinsAwarded;
          const nextGemDust = Number(user.gem_dust || 0) + gemDustAwarded;
          const nextTitle = titleGranted || null;

          await postgres.query(
            `
              UPDATE users
              SET horror_coins = $2,
                  gem_dust = $3,
                  title = CASE WHEN $4::text IS NULL THEN title ELSE $4::text END,
                  updated_at = NOW()
              WHERE id = $1
            `,
            [req.user.id, nextCoins, nextGemDust, nextTitle]
          );

          const claimId = makeId('lclaim');
          await postgres.query(
            `
              INSERT INTO loyalty_claims (id, user_id, reward_key, reward_value, idempotency_key, metadata, claimed_at, created_at)
              VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW())
            `,
            [
              claimId,
              req.user.id,
              rewardKey,
              coinsAwarded + gemDustAwarded,
              idempotencyKey,
              JSON.stringify({
                reward,
                coinsAwarded,
                gemDustAwarded,
                titleGranted
              })
            ]
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
              reason: 'loyalty_claim',
              rewardKey,
              coins: coinsAwarded,
              gemDust: gemDustAwarded,
              titleGranted,
              pointsSpent: reward.pointsCost
            }
          });

          await postgres.query('COMMIT');

          return {
            success: true,
            claimId,
            rewardKey,
            coinsAwarded,
            gemDustAwarded,
            titleGranted,
            pointsSpent: reward.pointsCost,
            pointsRemaining: newPoints,
            currentTier: tier,
            currentTierBenefits: getTierBenefits(tier),
            resourceType: 'loyalty_claim',
            resourceId: claimId
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
      REWARD_ALREADY_CLAIMED: 409,
      INSUFFICIENT_LOYALTY_POINTS: 409,
      LOYALTY_TIER_REQUIRED: 403
    };

    const errorMessages = {
      USER_NOT_FOUND: 'User loyalty account missing',
      REWARD_ALREADY_CLAIMED: 'Reward already claimed',
      INSUFFICIENT_LOYALTY_POINTS: 'Not enough loyalty points',
      LOYALTY_TIER_REQUIRED: 'Reward requires a higher loyalty tier'
    };

    return failInternal(
      res,
      statusByCode[error.code] || 400,
      error.code || 'LOYALTY_CLAIM_FAILED',
      errorMessages[error.code] || 'Unable to claim loyalty reward',
      error,
      { userId: req.user?.id || null, rewardKey }
    );
  }
});

module.exports = router;
