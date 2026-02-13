/**
 * Engagement API Routes (6.1)
 * Daily spin wheel, treasure maps, and skin crafting.
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const postgres = require('../models/postgres');
const { executeIdempotentMutation, appendAuditEvent, makeId } = require('../services/economyMutationService');

const PREMIUM_SPIN_GEM_COST = 10;
const TREASURE_MAP_PIECE_COUNT = 6;
const TREASURE_LEGENDARY_ITEM_KEY = 'skin_mapbound_wraith_legendary';
const CRAFT_GEM_COST = 15;
const CRAFT_INPUT_COUNT = 3;
const GEM_DUST_PER_GEM = 100;
const GEM_DUST_MONTHLY_CAP = 500;

const FREE_GEM_SOURCES = [
  { key: 'daily_login_day_7', label: 'Daily login (Day 7)', gems: '25', frequency: 'Weekly' },
  { key: 'battle_pass_free_tier', label: 'Battle Pass free tier', gems: '200-500', frequency: 'Seasonal' },
  { key: 'achievements', label: 'Achievements', gems: '5-200', frequency: 'One-time' },
  { key: 'referrals', label: 'Referrals', gems: '100-5,000', frequency: 'Per referral' },
  { key: 'daily_quests_overhaul', label: 'Daily Quests (3/day)', gems: '15 gem dust + souls + chest chance', frequency: 'Daily' },
  { key: 'weekly_quests_overhaul', label: 'Weekly Quests', gems: '300-1,000', frequency: 'Weekly' },
  { key: 'season_quest_overhaul', label: 'Season Quest Finale', gems: '5,000 + exclusive skin', frequency: 'Seasonal' },
  { key: 'tournaments', label: 'Tournament participation', gems: '50-1,000 (+ items)', frequency: 'Per event' },
  { key: 'seasonal_events', label: 'Seasonal events', gems: '50-500', frequency: 'Per event' },
  { key: 'level_milestones', label: 'Level milestones', gems: '10-50', frequency: 'Every 25 levels' },
  { key: 'community_goals', label: 'Community goals', gems: '50-100', frequency: 'Milestone' },
  { key: 'holiday_events', label: 'Holiday events', gems: '2x rewards weekends', frequency: 'Event-based' }
];

const TREASURE_MAP_PIECE_KEYS = Array.from(
  { length: TREASURE_MAP_PIECE_COUNT },
  (_, i) => `treasure_map_piece_${i + 1}`
);

const UNCOMMON_SKIN_KEYS = new Set([
  'skin_shadow',
  'skin_bloodied',
  'skin_woodsman'
]);

const RARE_SKIN_OUTPUTS = [
  'skin_hunter',
  'skin_werewolf',
  'skin_scarecrow',
  'skin_cultist'
];

const CRAFT_EXCLUSIVE_SKIN_OUTPUTS = [
  'skin_rift_stalker_crafted',
  'skin_bloodforged_crafted'
];

const SPIN_POOLS = {
  free: [
    { weight: 34, type: 'souls', min: 100, max: 1500 },
    { weight: 30, type: 'souls', min: 1500, max: 4500 },
    { weight: 14, type: 'souls', min: 4500, max: 10000 },
    { weight: 10, type: 'gems', min: 1, max: 20 },
    { weight: 6, type: 'gems', min: 20, max: 60 },
    { weight: 3, type: 'gems', min: 60, max: 100 },
    { weight: 2, type: 'chest', items: ['chest_bone_common', 'chest_shadow_rare'] },
    { weight: 1, type: 'skin', items: ['skin_shadow', 'skin_woodsman', 'skin_hunter'] }
  ],
  premium: [
    { weight: 24, type: 'souls', min: 2000, max: 7000 },
    { weight: 22, type: 'souls', min: 7000, max: 10000 },
    { weight: 24, type: 'gems', min: 15, max: 60 },
    { weight: 12, type: 'gems', min: 60, max: 100 },
    { weight: 10, type: 'chest', items: ['chest_shadow_rare', 'chest_nightfall_epic', 'chest_void_legendary'] },
    { weight: 8, type: 'skin', items: ['skin_hunter', 'skin_werewolf', 'skin_plague', 'skin_void'] }
  ]
};

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

function logEngagementError(error, metadata = {}) {
  console.error('[api/engagement] request failed', {
    code: error?.code || null,
    message: error?.message || String(error),
    stack: error?.stack || null,
    ...metadata
  });
}

function failInternal(res, status, code, publicMessage, error, metadata = {}) {
  logEngagementError(error, { status, code, ...metadata });
  return fail(res, status, code, publicMessage);
}

function ensurePg(res) {
  if (!postgres.isEnabled()) {
    fail(res, 503, 'PG_REQUIRED', 'This endpoint requires PostgreSQL-backed economy mode');
    return false;
  }
  return true;
}

function toInventory(rawInventory) {
  return Array.isArray(rawInventory) ? [...rawInventory] : [];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickWeighted(pool) {
  const totalWeight = pool.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  if (totalWeight <= 0) return pool[0] || null;

  let roll = Math.random() * totalWeight;
  for (const item of pool) {
    roll -= Number(item.weight || 0);
    if (roll <= 0) return item;
  }
  return pool[pool.length - 1] || null;
}

function pickReward(spinType) {
  const pool = SPIN_POOLS[spinType] || SPIN_POOLS.free;
  const selected = pickWeighted(pool);
  if (!selected) {
    return { rewardType: 'souls', amount: 100 };
  }

  if (selected.type === 'souls') {
    return {
      rewardType: 'souls',
      amount: randomInt(selected.min, selected.max)
    };
  }

  if (selected.type === 'gems') {
    return {
      rewardType: 'gems',
      amount: randomInt(selected.min, selected.max)
    };
  }

  if (selected.type === 'chest') {
    const itemKey = selected.items[randomInt(0, selected.items.length - 1)];
    return {
      rewardType: 'chest',
      itemKey,
      amount: 1
    };
  }

  if (selected.type === 'skin') {
    const itemKey = selected.items[randomInt(0, selected.items.length - 1)];
    return {
      rewardType: 'skin',
      itemKey,
      amount: 1
    };
  }

  return { rewardType: 'souls', amount: 100 };
}

function applyRewardToBalances({ horrorCoins, bloodGems, inventory }, reward) {
  const next = {
    horrorCoins: Number(horrorCoins || 0),
    bloodGems: Number(bloodGems || 0),
    inventory: [...inventory]
  };

  if (reward.rewardType === 'souls') {
    next.horrorCoins += Number(reward.amount || 0);
  } else if (reward.rewardType === 'gems') {
    next.bloodGems += Number(reward.amount || 0);
  } else if (reward.rewardType === 'chest' || reward.rewardType === 'skin') {
    if (reward.itemKey) next.inventory.push(reward.itemKey);
  }

  return next;
}

function getPieceCounts(inventory) {
  const counts = {};
  for (const key of TREASURE_MAP_PIECE_KEYS) {
    counts[key] = 0;
  }

  for (const item of inventory) {
    if (Object.prototype.hasOwnProperty.call(counts, item)) {
      counts[item] += 1;
    }
  }

  return counts;
}

function mapStatusFromInventory(inventory) {
  const pieceCounts = getPieceCounts(inventory);
  const ownedPieces = [];
  const missingPieces = [];

  for (let i = 1; i <= TREASURE_MAP_PIECE_COUNT; i += 1) {
    const pieceKey = `treasure_map_piece_${i}`;
    if (pieceCounts[pieceKey] > 0) {
      ownedPieces.push(i);
    } else {
      missingPieces.push(i);
    }
  }

  const setsClaimable = TREASURE_MAP_PIECE_KEYS
    .map((key) => pieceCounts[key])
    .reduce((min, count) => Math.min(min, count), Number.MAX_SAFE_INTEGER);

  return {
    ownedPieces,
    missingPieces,
    canClaimTreasure: missingPieces.length === 0,
    setsClaimable: Number.isFinite(setsClaimable) ? Math.max(0, setsClaimable) : 0
  };
}

function removeItemsFromInventory(inventory, itemKeys) {
  const next = [...inventory];
  for (const itemKey of itemKeys) {
    const idx = next.indexOf(itemKey);
    if (idx < 0) return null;
    next.splice(idx, 1);
  }
  return next;
}

function normalizePieceNumber(value) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > TREASURE_MAP_PIECE_COUNT) {
    return null;
  }
  return parsed;
}

async function loadGemDustConversionSnapshot(userId) {
  const monthResult = await postgres.query(
    `SELECT date_trunc('month', NOW() AT TIME ZONE 'UTC')::date AS month_start`
  );
  const monthStart = monthResult.rows[0]?.month_start;

  const convertedResult = await postgres.query(
    `
      SELECT COALESCE(SUM(gems_converted), 0)::int AS converted
      FROM gem_dust_conversion_claims
      WHERE user_id = $1
        AND conversion_month = $2::date
    `,
    [userId, monthStart]
  );

  const convertedThisMonth = Number(convertedResult.rows[0]?.converted || 0);
  return {
    monthStart,
    convertedThisMonth,
    remainingMonthlyCap: Math.max(GEM_DUST_MONTHLY_CAP - convertedThisMonth, 0)
  };
}

router.get('/premium-currency/sources', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  try {
    const userResult = await postgres.query(
      `
        SELECT id, horror_coins, gem_dust, COALESCE(blood_gems, 0) AS blood_gems
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [req.user.id]
    );
    const user = userResult.rows[0];
    if (!user) return fail(res, 404, 'USER_NOT_FOUND', 'User not found');

    const conversion = await loadGemDustConversionSnapshot(req.user.id);
    const availableByDust = Math.floor(Number(user.gem_dust || 0) / GEM_DUST_PER_GEM);
    const convertibleNow = Math.max(0, Math.min(availableByDust, conversion.remainingMonthlyCap));

    return res.json({
      success: true,
      sources: FREE_GEM_SOURCES,
      estimatedMonthlyF2pGems: {
        min: 1000,
        max: 2000
      },
      balances: {
        souls: Number(user.horror_coins || 0),
        gems: Number(user.blood_gems || 0),
        gemDust: Number(user.gem_dust || 0)
      },
      gemDustConversion: {
        rateDustPerGem: GEM_DUST_PER_GEM,
        monthlyCapGems: GEM_DUST_MONTHLY_CAP,
        monthStart: conversion.monthStart,
        convertedThisMonth: conversion.convertedThisMonth,
        remainingMonthlyCap: conversion.remainingMonthlyCap,
        availableByDust,
        convertibleNow
      }
    });
  } catch (error) {
    return failInternal(
      res,
      500,
      'PREMIUM_CURRENCY_SOURCES_FAILED',
      'Unable to load premium currency sources right now',
      error,
      { userId: req.user?.id || null }
    );
  }
});

router.get('/gem-dust/conversion-status', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  try {
    const userResult = await postgres.query(
      `
        SELECT id, gem_dust, COALESCE(blood_gems, 0) AS blood_gems
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [req.user.id]
    );
    const user = userResult.rows[0];
    if (!user) return fail(res, 404, 'USER_NOT_FOUND', 'User not found');

    const conversion = await loadGemDustConversionSnapshot(req.user.id);
    const availableByDust = Math.floor(Number(user.gem_dust || 0) / GEM_DUST_PER_GEM);

    return res.json({
      success: true,
      rateDustPerGem: GEM_DUST_PER_GEM,
      monthlyCapGems: GEM_DUST_MONTHLY_CAP,
      monthStart: conversion.monthStart,
      convertedThisMonth: conversion.convertedThisMonth,
      remainingMonthlyCap: conversion.remainingMonthlyCap,
      availableByDust,
      convertibleNow: Math.max(0, Math.min(availableByDust, conversion.remainingMonthlyCap)),
      balances: {
        gems: Number(user.blood_gems || 0),
        gemDust: Number(user.gem_dust || 0)
      }
    });
  } catch (error) {
    return failInternal(
      res,
      500,
      'GEM_DUST_CONVERSION_STATUS_FAILED',
      'Unable to load gem dust conversion status right now',
      error,
      { userId: req.user?.id || null }
    );
  }
});

router.post('/gem-dust/convert', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');
  }

  const requestedGems = parseInt(req.body?.gems, 10);
  if (!Number.isFinite(requestedGems) || requestedGems < 1 || requestedGems > GEM_DUST_MONTHLY_CAP) {
    return fail(res, 400, 'INVALID_GEM_AMOUNT', `gems must be between 1 and ${GEM_DUST_MONTHLY_CAP}`);
  }

  try {
    const mutation = await executeIdempotentMutation({
      scope: 'engagement.gem_dust.convert',
      idempotencyKey,
      requestPayload: { userId: req.user.id, gems: requestedGems },
      actorUserId: req.user.id,
      targetUserId: req.user.id,
      entityType: 'gem_dust_conversion',
      eventType: 'gem_dust_convert',
      requestId: req.header('x-request-id') || null,
      perfChannel: 'engagement.gem_dust.convert',
      mutationFn: async () => {
        await postgres.query('BEGIN');
        try {
          const userResult = await postgres.query(
            `
              SELECT id, gem_dust, COALESCE(blood_gems, 0) AS blood_gems
              FROM users
              WHERE id = $1
              LIMIT 1
              FOR UPDATE
            `,
            [req.user.id]
          );
          const user = userResult.rows[0];
          if (!user) {
            const err = new Error('User not found');
            err.code = 'USER_NOT_FOUND';
            throw err;
          }

          const conversion = await loadGemDustConversionSnapshot(req.user.id);
          if (conversion.remainingMonthlyCap <= 0) {
            const err = new Error('Monthly gem dust conversion cap reached');
            err.code = 'CONVERSION_CAP_REACHED';
            throw err;
          }

          const gemDustBalance = Number(user.gem_dust || 0);
          const availableByDust = Math.floor(gemDustBalance / GEM_DUST_PER_GEM);
          if (availableByDust <= 0) {
            const err = new Error('Not enough gem dust');
            err.code = 'INSUFFICIENT_GEM_DUST';
            throw err;
          }

          const gemsConverted = Math.max(
            0,
            Math.min(requestedGems, availableByDust, conversion.remainingMonthlyCap)
          );
          if (gemsConverted <= 0) {
            const err = new Error('Unable to convert gem dust at this time');
            err.code = 'CONVERSION_NOT_AVAILABLE';
            throw err;
          }

          const dustSpent = gemsConverted * GEM_DUST_PER_GEM;
          const nextGemDust = gemDustBalance - dustSpent;
          const nextGems = Number(user.blood_gems || 0) + gemsConverted;

          await postgres.query(
            `
              UPDATE users
              SET gem_dust = $2,
                  blood_gems = $3,
                  updated_at = NOW()
              WHERE id = $1
            `,
            [req.user.id, nextGemDust, nextGems]
          );

          const conversionId = makeId('gdconv');
          await postgres.query(
            `
              INSERT INTO gem_dust_conversion_claims (
                id, user_id, conversion_month, gems_converted, dust_spent,
                idempotency_key, metadata, created_at
              )
              VALUES ($1, $2, $3::date, $4, $5, $6, '{}'::jsonb, NOW())
            `,
            [
              conversionId,
              req.user.id,
              conversion.monthStart,
              gemsConverted,
              dustSpent,
              idempotencyKey
            ]
          );

          await appendAuditEvent({
            actorUserId: req.user.id,
            targetUserId: req.user.id,
            entityType: 'gem_dust_conversion',
            entityId: conversionId,
            eventType: 'gem_dust.converted',
            requestId: req.header('x-request-id') || null,
            idempotencyKey,
            metadata: {
              gemsConverted,
              dustSpent,
              monthStart: conversion.monthStart
            }
          });

          await postgres.query('COMMIT');

          const convertedThisMonth = conversion.convertedThisMonth + gemsConverted;
          return {
            success: true,
            conversionId,
            gemsConverted,
            dustSpent,
            conversionRate: GEM_DUST_PER_GEM,
            monthlyCapGems: GEM_DUST_MONTHLY_CAP,
            convertedThisMonth,
            remainingMonthlyCap: Math.max(GEM_DUST_MONTHLY_CAP - convertedThisMonth, 0),
            balances: {
              gems: nextGems,
              gemDust: nextGemDust
            },
            resourceType: 'gem_dust_conversion',
            resourceId: conversionId
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
      USER_NOT_FOUND: 404,
      CONVERSION_CAP_REACHED: 409,
      INSUFFICIENT_GEM_DUST: 409,
      CONVERSION_NOT_AVAILABLE: 409
    };

    const errorMessages = {
      USER_NOT_FOUND: 'User not found',
      CONVERSION_CAP_REACHED: 'Monthly gem dust conversion cap reached',
      INSUFFICIENT_GEM_DUST: 'Not enough gem dust',
      CONVERSION_NOT_AVAILABLE: 'Unable to convert gem dust at this time'
    };

    return failInternal(
      res,
      statusByCode[error.code] || 400,
      error.code || 'GEM_DUST_CONVERSION_FAILED',
      errorMessages[error.code] || 'Unable to convert gem dust',
      error,
      { userId: req.user?.id || null, requestedGems }
    );
  }
});

router.get('/daily-spin/status', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  try {
    const userResult = await postgres.query(
      'SELECT id, horror_coins, COALESCE(blood_gems, 0) AS blood_gems FROM users WHERE id = $1 LIMIT 1',
      [req.user.id]
    );
    const user = userResult.rows[0];
    if (!user) return fail(res, 404, 'USER_NOT_FOUND', 'User not found');

    const todaySpinsResult = await postgres.query(
      `
        SELECT spin_type AS "spinType", reward_type AS "rewardType", reward_payload AS "rewardPayload",
               spent_gems AS "spentGems", created_at AS "createdAt"
        FROM daily_spin_claims
        WHERE user_id = $1
          AND spin_date = CURRENT_DATE
        ORDER BY created_at DESC
      `,
      [req.user.id]
    );

    const todaySpins = todaySpinsResult.rows;
    const freeClaimed = todaySpins.some((row) => row.spinType === 'free');

    return res.json({
      success: true,
      canClaimFreeSpin: !freeClaimed,
      premiumSpinCostGems: PREMIUM_SPIN_GEM_COST,
      balances: {
        souls: Number(user.horror_coins || 0),
        gems: Number(user.blood_gems || 0)
      },
      todaySpins
    });
  } catch (error) {
    return failInternal(
      res,
      500,
      'DAILY_SPIN_STATUS_FAILED',
      'Unable to load daily spin status right now',
      error,
      { userId: req.user?.id || null }
    );
  }
});

async function runSpin(req, res, spinType) {
  if (!ensurePg(res)) return;

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');
  }

  const isPremium = spinType === 'premium';
  const scope = isPremium ? 'engagement.daily_spin.premium' : 'engagement.daily_spin.free';

  try {
    const mutation = await executeIdempotentMutation({
      scope,
      idempotencyKey,
      requestPayload: { userId: req.user.id, spinType },
      actorUserId: req.user.id,
      targetUserId: req.user.id,
      entityType: 'daily_spin',
      eventType: `daily_spin_${spinType}`,
      requestId: req.header('x-request-id') || null,
      perfChannel: `engagement.daily_spin.${spinType}`,
      mutationFn: async () => {
        await postgres.query('BEGIN');
        try {
          const userResult = await postgres.query(
            'SELECT id, horror_coins, COALESCE(blood_gems, 0) AS blood_gems, inventory FROM users WHERE id = $1 LIMIT 1 FOR UPDATE',
            [req.user.id]
          );
          const user = userResult.rows[0];
          if (!user) {
            const err = new Error('User not found');
            err.code = 'USER_NOT_FOUND';
            throw err;
          }

          if (!isPremium) {
            const existing = await postgres.query(
              `
                SELECT id
                FROM daily_spin_claims
                WHERE user_id = $1
                  AND spin_type = 'free'
                  AND spin_date = CURRENT_DATE
                LIMIT 1
              `,
              [req.user.id]
            );
            if (existing.rows.length > 0) {
              const err = new Error('Free daily spin already claimed');
              err.code = 'FREE_SPIN_ALREADY_CLAIMED';
              throw err;
            }
          }

          const baseState = {
            horrorCoins: Number(user.horror_coins || 0),
            bloodGems: Number(user.blood_gems || 0),
            inventory: toInventory(user.inventory)
          };

          let spentGems = 0;
          if (isPremium) {
            if (baseState.bloodGems < PREMIUM_SPIN_GEM_COST) {
              const err = new Error('Not enough gems');
              err.code = 'INSUFFICIENT_GEMS';
              throw err;
            }
            spentGems = PREMIUM_SPIN_GEM_COST;
            baseState.bloodGems -= PREMIUM_SPIN_GEM_COST;
          }

          const reward = pickReward(spinType);
          const next = applyRewardToBalances(baseState, reward);

          await postgres.query(
            `
              UPDATE users
              SET horror_coins = $2,
                  blood_gems = $3,
                  inventory = $4::jsonb,
                  updated_at = NOW()
              WHERE id = $1
            `,
            [req.user.id, next.horrorCoins, next.bloodGems, JSON.stringify(next.inventory)]
          );

          const spinId = makeId('spin');
          await postgres.query(
            `
              INSERT INTO daily_spin_claims (
                id, user_id, spin_type, spin_date, reward_type, reward_payload,
                spent_gems, idempotency_key, metadata, created_at
              )
              VALUES ($1, $2, $3, CURRENT_DATE, $4, $5::jsonb, $6, $7, '{}'::jsonb, NOW())
            `,
            [spinId, req.user.id, spinType, reward.rewardType, JSON.stringify(reward), spentGems, idempotencyKey]
          );

          await appendAuditEvent({
            actorUserId: req.user.id,
            targetUserId: req.user.id,
            entityType: 'daily_spin',
            entityId: spinId,
            eventType: 'daily_spin.reward_granted',
            requestId: req.header('x-request-id') || null,
            idempotencyKey,
            metadata: {
              spinType,
              spentGems,
              reward
            }
          });

          await postgres.query('COMMIT');

          return {
            success: true,
            spinId,
            spinType,
            spentGems,
            reward,
            balances: {
              souls: next.horrorCoins,
              gems: next.bloodGems
            },
            resourceType: 'daily_spin',
            resourceId: spinId
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
      USER_NOT_FOUND: 404,
      FREE_SPIN_ALREADY_CLAIMED: 409,
      INSUFFICIENT_GEMS: 409
    };

    const errorMessages = {
      USER_NOT_FOUND: 'User not found',
      FREE_SPIN_ALREADY_CLAIMED: 'Free daily spin already claimed',
      INSUFFICIENT_GEMS: 'Not enough gems'
    };

    return failInternal(
      res,
      statusByCode[error.code] || 400,
      error.code || 'DAILY_SPIN_FAILED',
      errorMessages[error.code] || 'Unable to complete spin',
      error,
      { userId: req.user?.id || null, spinType }
    );
  }
}

router.post('/daily-spin/free', authMiddleware, async (req, res) => runSpin(req, res, 'free'));
router.post('/daily-spin/premium', authMiddleware, async (req, res) => runSpin(req, res, 'premium'));

router.get('/treasure-map/status', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  try {
    const userResult = await postgres.query(
      'SELECT id, inventory FROM users WHERE id = $1 LIMIT 1',
      [req.user.id]
    );
    const user = userResult.rows[0];
    if (!user) return fail(res, 404, 'USER_NOT_FOUND', 'User not found');

    const inventory = toInventory(user.inventory);
    const status = mapStatusFromInventory(inventory);

    const treasureClaims = await postgres.query(
      'SELECT COUNT(1)::int AS c FROM treasure_map_treasure_claims WHERE user_id = $1',
      [req.user.id]
    );

    return res.json({
      success: true,
      piecesRequired: TREASURE_MAP_PIECE_COUNT,
      ...status,
      totalTreasuresClaimed: Number(treasureClaims.rows[0]?.c || 0)
    });
  } catch (error) {
    return failInternal(
      res,
      500,
      'TREASURE_MAP_STATUS_FAILED',
      'Unable to load treasure map status right now',
      error,
      { userId: req.user?.id || null }
    );
  }
});

router.post('/treasure-map/piece', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');
  }

  const sourceGame = typeof req.body?.sourceGame === 'string' ? req.body.sourceGame.trim().slice(0, 120) : null;
  const providedPiece = normalizePieceNumber(req.body?.pieceNumber);
  const pieceNumber = providedPiece || randomInt(1, TREASURE_MAP_PIECE_COUNT);
  const pieceKey = `treasure_map_piece_${pieceNumber}`;

  try {
    const mutation = await executeIdempotentMutation({
      scope: 'engagement.treasure_map.piece',
      idempotencyKey,
      requestPayload: { userId: req.user.id, pieceNumber, sourceGame },
      actorUserId: req.user.id,
      targetUserId: req.user.id,
      entityType: 'treasure_map_piece_claim',
      eventType: 'treasure_map_piece_claim',
      requestId: req.header('x-request-id') || null,
      perfChannel: 'engagement.treasure_map.piece',
      mutationFn: async () => {
        const velocity = await postgres.query(
          `
            SELECT COUNT(1)::int AS c
            FROM treasure_map_piece_claims
            WHERE user_id = $1
              AND created_at >= NOW() - INTERVAL '1 minute'
          `,
          [req.user.id]
        );

        if ((velocity.rows[0]?.c || 0) >= 20) {
          const err = new Error('Treasure map piece claim rate limit exceeded');
          err.code = 'TREASURE_MAP_RATE_LIMITED';
          throw err;
        }

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

          const inventory = toInventory(user.inventory);
          inventory.push(pieceKey);

          await postgres.query(
            'UPDATE users SET inventory = $2::jsonb, updated_at = NOW() WHERE id = $1',
            [req.user.id, JSON.stringify(inventory)]
          );

          const claimId = makeId('tmpiece');
          await postgres.query(
            `
              INSERT INTO treasure_map_piece_claims (
                id, user_id, piece_number, source_game, piece_item_key, idempotency_key, metadata, created_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, '{}'::jsonb, NOW())
            `,
            [claimId, req.user.id, pieceNumber, sourceGame, pieceKey, idempotencyKey]
          );

          const status = mapStatusFromInventory(inventory);

          await appendAuditEvent({
            actorUserId: req.user.id,
            targetUserId: req.user.id,
            entityType: 'treasure_map_piece_claim',
            entityId: claimId,
            eventType: 'treasure_map_piece.claimed',
            requestId: req.header('x-request-id') || null,
            idempotencyKey,
            metadata: {
              pieceNumber,
              pieceKey,
              sourceGame
            }
          });

          await postgres.query('COMMIT');

          return {
            success: true,
            claimId,
            pieceNumber,
            pieceKey,
            ...status,
            resourceType: 'treasure_map_piece_claim',
            resourceId: claimId
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
      USER_NOT_FOUND: 404,
      TREASURE_MAP_RATE_LIMITED: 429
    };

    const errorMessages = {
      USER_NOT_FOUND: 'User not found',
      TREASURE_MAP_RATE_LIMITED: 'Treasure map piece claim rate limit exceeded'
    };

    return failInternal(
      res,
      statusByCode[error.code] || 400,
      error.code || 'TREASURE_MAP_PIECE_CLAIM_FAILED',
      errorMessages[error.code] || 'Unable to claim treasure map piece',
      error,
      { userId: req.user?.id || null, pieceNumber, sourceGame }
    );
  }
});

router.post('/treasure-map/claim', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');
  }

  try {
    const mutation = await executeIdempotentMutation({
      scope: 'engagement.treasure_map.claim',
      idempotencyKey,
      requestPayload: { userId: req.user.id },
      actorUserId: req.user.id,
      targetUserId: req.user.id,
      entityType: 'treasure_map_treasure_claim',
      eventType: 'treasure_map_treasure_claim',
      requestId: req.header('x-request-id') || null,
      perfChannel: 'engagement.treasure_map.claim',
      mutationFn: async () => {
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

          const inventory = toInventory(user.inventory);
          const afterConsume = removeItemsFromInventory(inventory, TREASURE_MAP_PIECE_KEYS);
          if (!afterConsume) {
            const err = new Error('Missing required treasure map pieces');
            err.code = 'MISSING_MAP_PIECES';
            throw err;
          }

          afterConsume.push(TREASURE_LEGENDARY_ITEM_KEY);

          await postgres.query(
            'UPDATE users SET inventory = $2::jsonb, updated_at = NOW() WHERE id = $1',
            [req.user.id, JSON.stringify(afterConsume)]
          );

          const claimId = makeId('tmclaim');
          await postgres.query(
            `
              INSERT INTO treasure_map_treasure_claims (
                id, user_id, reward_item_key, consumed_piece_count, idempotency_key, metadata, created_at
              )
              VALUES ($1, $2, $3, $4, $5, '{}'::jsonb, NOW())
            `,
            [claimId, req.user.id, TREASURE_LEGENDARY_ITEM_KEY, TREASURE_MAP_PIECE_COUNT, idempotencyKey]
          );

          await appendAuditEvent({
            actorUserId: req.user.id,
            targetUserId: req.user.id,
            entityType: 'treasure_map_treasure_claim',
            entityId: claimId,
            eventType: 'treasure_map.treasure_claimed',
            requestId: req.header('x-request-id') || null,
            idempotencyKey,
            metadata: {
              rewardItemKey: TREASURE_LEGENDARY_ITEM_KEY,
              consumedPieceCount: TREASURE_MAP_PIECE_COUNT
            }
          });

          await postgres.query('COMMIT');

          return {
            success: true,
            claimId,
            reward: {
              type: 'skin',
              rarity: 'legendary',
              itemKey: TREASURE_LEGENDARY_ITEM_KEY
            },
            remainingMapStatus: mapStatusFromInventory(afterConsume),
            resourceType: 'treasure_map_treasure_claim',
            resourceId: claimId
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
      USER_NOT_FOUND: 404,
      MISSING_MAP_PIECES: 409
    };

    const errorMessages = {
      USER_NOT_FOUND: 'User not found',
      MISSING_MAP_PIECES: 'Collect all 6 map pieces before claiming treasure'
    };

    return failInternal(
      res,
      statusByCode[error.code] || 400,
      error.code || 'TREASURE_MAP_CLAIM_FAILED',
      errorMessages[error.code] || 'Unable to claim treasure map reward',
      error,
      { userId: req.user?.id || null }
    );
  }
});

router.post('/crafting/skins/combine', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');
  }

  const itemKeys = Array.isArray(req.body?.itemKeys) ? req.body.itemKeys.map((item) => String(item || '').trim()) : [];
  if (itemKeys.length !== CRAFT_INPUT_COUNT || itemKeys.some((key) => !key)) {
    return fail(res, 400, 'INVALID_RECIPE_INPUTS', `itemKeys must contain exactly ${CRAFT_INPUT_COUNT} skin keys`);
  }

  if (itemKeys.some((itemKey) => !UNCOMMON_SKIN_KEYS.has(itemKey))) {
    return fail(res, 400, 'INVALID_RECIPE_INPUTS', 'Crafting recipe requires 3 uncommon skins');
  }

  try {
    const mutation = await executeIdempotentMutation({
      scope: 'engagement.crafting.skin_combine',
      idempotencyKey,
      requestPayload: { userId: req.user.id, itemKeys },
      actorUserId: req.user.id,
      targetUserId: req.user.id,
      entityType: 'skin_crafting_event',
      eventType: 'skin_crafting_combine',
      requestId: req.header('x-request-id') || null,
      perfChannel: 'engagement.crafting.skin_combine',
      mutationFn: async () => {
        await postgres.query('BEGIN');
        try {
          const userResult = await postgres.query(
            'SELECT id, COALESCE(blood_gems, 0) AS blood_gems, inventory FROM users WHERE id = $1 LIMIT 1 FOR UPDATE',
            [req.user.id]
          );
          const user = userResult.rows[0];
          if (!user) {
            const err = new Error('User not found');
            err.code = 'USER_NOT_FOUND';
            throw err;
          }

          const currentGems = Number(user.blood_gems || 0);
          if (currentGems < CRAFT_GEM_COST) {
            const err = new Error('Not enough gems');
            err.code = 'INSUFFICIENT_GEMS';
            throw err;
          }

          const inventory = toInventory(user.inventory);
          const afterConsume = removeItemsFromInventory(inventory, itemKeys);
          if (!afterConsume) {
            const err = new Error('One or more crafting inputs are not owned');
            err.code = 'ITEM_NOT_OWNED';
            throw err;
          }

          const craftedPool = Math.random() < 0.2 ? CRAFT_EXCLUSIVE_SKIN_OUTPUTS : RARE_SKIN_OUTPUTS;
          const outputItemKey = craftedPool[randomInt(0, craftedPool.length - 1)];
          const craftExclusive = CRAFT_EXCLUSIVE_SKIN_OUTPUTS.includes(outputItemKey);

          afterConsume.push(outputItemKey);

          const newGems = currentGems - CRAFT_GEM_COST;
          await postgres.query(
            `
              UPDATE users
              SET blood_gems = $2,
                  inventory = $3::jsonb,
                  updated_at = NOW()
              WHERE id = $1
            `,
            [req.user.id, newGems, JSON.stringify(afterConsume)]
          );

          const craftId = makeId('craft');
          await postgres.query(
            `
              INSERT INTO skin_crafting_events (
                id, user_id, input_item_keys, output_item_key, output_rarity, gem_cost,
                idempotency_key, metadata, created_at
              )
              VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, '{}'::jsonb, NOW())
            `,
            [craftId, req.user.id, JSON.stringify(itemKeys), outputItemKey, 'rare', CRAFT_GEM_COST, idempotencyKey]
          );

          await appendAuditEvent({
            actorUserId: req.user.id,
            targetUserId: req.user.id,
            entityType: 'skin_crafting_event',
            entityId: craftId,
            eventType: 'skin_crafting.completed',
            requestId: req.header('x-request-id') || null,
            idempotencyKey,
            metadata: {
              inputItemKeys: itemKeys,
              outputItemKey,
              outputRarity: 'rare',
              craftExclusive,
              gemCost: CRAFT_GEM_COST
            }
          });

          await postgres.query('COMMIT');

          return {
            success: true,
            craftId,
            gemCost: CRAFT_GEM_COST,
            output: {
              itemKey: outputItemKey,
              rarity: 'rare',
              craftExclusive
            },
            remainingGems: newGems,
            resourceType: 'skin_crafting_event',
            resourceId: craftId
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
      USER_NOT_FOUND: 404,
      INSUFFICIENT_GEMS: 409,
      ITEM_NOT_OWNED: 409
    };

    const errorMessages = {
      USER_NOT_FOUND: 'User not found',
      INSUFFICIENT_GEMS: 'Not enough gems',
      ITEM_NOT_OWNED: 'One or more crafting inputs are not owned'
    };

    return failInternal(
      res,
      statusByCode[error.code] || 400,
      error.code || 'SKIN_CRAFTING_FAILED',
      errorMessages[error.code] || 'Unable to craft skin',
      error,
      { userId: req.user?.id || null, itemKeys }
    );
  }
});

module.exports = router;
