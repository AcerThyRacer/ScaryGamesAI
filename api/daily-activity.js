/**
 * Daily Activity + Engagement Earning API Routes
 * Quest system overhaul: daily/weekly/season quests,
 * tournament participation rewards, and community goals.
 */

const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth');
const postgres = require('../models/postgres');
const { executeIdempotentMutation, appendAuditEvent, makeId } = require('../services/economyMutationService');

const DAILY_QUESTS = [
  {
    code: 'survive_5_rounds',
    label: 'Survive 5 rounds',
    rewards: { souls: 200, gemDust: 0, gems: 0, chestChance: 0, chestPool: [] }
  },
  {
    code: 'play_3_different_games',
    label: 'Play 3 different games',
    rewards: { souls: 0, gemDust: 15, gems: 0, chestChance: 0, chestPool: [] }
  },
  {
    code: 'complete_a_game',
    label: 'Complete a game',
    rewards: {
      souls: 100,
      gemDust: 0,
      gems: 0,
      chestChance: 0.25,
      chestPool: ['chest_bone_common', 'chest_shadow_rare', 'chest_nightfall_epic']
    }
  }
];

const WEEKLY_QUESTS = [
  {
    code: 'top_100_any_leaderboard',
    label: 'Top 100 on any leaderboard',
    rewards: { gems: 500 },
    requirement: null
  },
  {
    code: 'play_with_5_different_friends',
    label: 'Play with 5 different friends',
    rewards: { gems: 300 },
    requirement: null
  },
  {
    code: 'complete_20_daily_quests',
    label: 'Complete 20 daily quests',
    rewards: { gems: 1000 },
    requirement: { type: 'weekly_daily_quest_count', value: 20 }
  }
];

const SEASON_QUEST = {
  code: 'complete_all_15_seasonal_quests',
  label: 'Complete all 15 seasonal quests',
  requiredCount: 15,
  rewards: {
    gems: 5000,
    exclusiveSkin: 'skin_season_conqueror_exclusive'
  }
};

const TOURNAMENT_REWARDS = {
  participation: {
    tier: 'participation',
    label: 'Participation',
    souls: 500,
    gems: 0,
    itemKey: null,
    itemType: null
  },
  top_50: {
    tier: 'top_50',
    label: 'Top 50%',
    souls: 1000,
    gems: 50,
    itemKey: null,
    itemType: null
  },
  top_10: {
    tier: 'top_10',
    label: 'Top 10%',
    souls: 5000,
    gems: 200,
    itemKey: 'chest_shadow_rare',
    itemType: 'rare_chest'
  },
  top_1: {
    tier: 'top_1',
    label: 'Top 1%',
    souls: 50000,
    gems: 1000,
    itemKey: 'item_mythic_tournament_relic',
    itemType: 'mythic_item'
  }
};

const COMMUNITY_GOAL_DEFAULTS = [
  {
    code: 'games_played_1000000',
    label: '1,000,000 games played',
    target: 1000000,
    rewardGems: 100,
    rewardMultiplier: 1,
    rewardDescription: 'Everyone gets 100 gems'
  },
  {
    code: 'new_players_10000',
    label: '10,000 new players',
    target: 10000,
    rewardGems: 50,
    rewardMultiplier: 1,
    rewardDescription: 'Everyone gets 50 gems'
  },
  {
    code: 'holiday_events',
    label: 'Holiday events',
    target: 1,
    rewardGems: 0,
    rewardMultiplier: 2,
    rewardDescription: 'Double rewards weekends'
  }
];

const HOLIDAY_GOAL_CODE = 'holiday_events';

const DAILY_QUEST_BY_CODE = DAILY_QUESTS.reduce((acc, quest) => {
  acc[quest.code] = quest;
  return acc;
}, {});

const WEEKLY_QUEST_BY_CODE = WEEKLY_QUESTS.reduce((acc, quest) => {
  acc[quest.code] = quest;
  return acc;
}, {});

const COMMUNITY_GOAL_BY_CODE = COMMUNITY_GOAL_DEFAULTS.reduce((acc, goal) => {
  acc[goal.code] = goal;
  return acc;
}, {});

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

function isWeekendUtc(now = new Date()) {
  const day = now.getUTCDay();
  return day === 0 || day === 6;
}

function getCurrentSeasonKey(now = new Date()) {
  const year = now.getUTCFullYear();
  const quarter = Math.floor(now.getUTCMonth() / 3) + 1;
  return `${year}-Q${quarter}`;
}

function parsePositiveInt(value, fallback = 0) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function normalizeQuestRewards(rewards, multiplier = 1) {
  const safeMultiplier = Math.max(1, Number(multiplier) || 1);
  return {
    souls: Math.floor(Number(rewards?.souls || 0) * safeMultiplier),
    gemDust: Math.floor(Number(rewards?.gemDust || 0) * safeMultiplier),
    gems: Math.floor(Number(rewards?.gems || 0) * safeMultiplier)
  };
}

function pickChestItem(pool) {
  if (!Array.isArray(pool) || pool.length === 0) return null;
  return pool[randomInt(0, pool.length - 1)];
}

async function ensureCommunityGoalsSeeded() {
  for (const goal of COMMUNITY_GOAL_DEFAULTS) {
    await postgres.query(
      `
        INSERT INTO community_goal_progress (
          id,
          goal_code,
          label,
          reward_description,
          target_value,
          current_value,
          reward_gems,
          reward_multiplier,
          metadata,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, 0, $6, $7, '{}'::jsonb, NOW(), NOW())
        ON CONFLICT (goal_code) DO NOTHING
      `,
      [
        makeId('cgoal'),
        goal.code,
        goal.label,
        goal.rewardDescription,
        goal.target,
        goal.rewardGems,
        goal.rewardMultiplier
      ]
    );
  }
}

async function getHolidayRewardMultiplier() {
  const result = await postgres.query(
    `
      SELECT target_value, current_value, reward_multiplier
      FROM community_goal_progress
      WHERE goal_code = $1
      LIMIT 1
    `,
    [HOLIDAY_GOAL_CODE]
  );

  const goal = result.rows[0];
  if (!goal) return 1;

  const achieved = Number(goal.current_value || 0) >= Number(goal.target_value || 0);
  if (!achieved) return 1;
  if (!isWeekendUtc()) return 1;

  return Math.max(1, Number(goal.reward_multiplier || 1));
}

async function getWeekStartDateUtc() {
  const result = await postgres.query(
    `SELECT date_trunc('week', NOW() AT TIME ZONE 'UTC')::date AS week_start`
  );
  return result.rows[0]?.week_start || null;
}

async function getWeeklyDailyQuestCount(userId, weekStart) {
  const result = await postgres.query(
    `
      SELECT COUNT(1)::int AS c
      FROM daily_activity_progress
      WHERE user_id = $1
        AND activity_date >= $2::date
        AND activity_date < ($2::date + INTERVAL '7 days')
    `,
    [userId, weekStart]
  );
  return Number(result.rows[0]?.c || 0);
}

async function loadStatusSnapshot(userId) {
  await ensureCommunityGoalsSeeded();

  const userResult = await postgres.query(
    `
      SELECT id,
             COALESCE(horror_coins, 0) AS horror_coins,
             COALESCE(gem_dust, 0) AS gem_dust,
             COALESCE(blood_gems, 0) AS blood_gems
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId]
  );
  const user = userResult.rows[0];
  if (!user) return null;

  const todayDailyResult = await postgres.query(
    `
      SELECT activity_code
      FROM daily_activity_progress
      WHERE user_id = $1
        AND activity_date = CURRENT_DATE
    `,
    [userId]
  );
  const todayCompletedCodes = todayDailyResult.rows.map((row) => row.activity_code);

  const weekStart = await getWeekStartDateUtc();
  const weeklyDailyQuestCount = await getWeeklyDailyQuestCount(userId, weekStart);

  const weeklyCompletionsResult = await postgres.query(
    `
      SELECT quest_code
      FROM weekly_quest_completions
      WHERE user_id = $1
        AND week_start_date = $2::date
    `,
    [userId, weekStart]
  );
  const weeklyCompletedCodes = new Set(weeklyCompletionsResult.rows.map((row) => row.quest_code));

  const seasonKey = getCurrentSeasonKey();
  const seasonProgressResult = await postgres.query(
    `
      SELECT completed_count, reward_claimed
      FROM season_quest_progress
      WHERE user_id = $1
        AND season_key = $2
      LIMIT 1
    `,
    [userId, seasonKey]
  );
  const seasonProgress = seasonProgressResult.rows[0] || { completed_count: 0, reward_claimed: false };

  const communityGoalRowsResult = await postgres.query(
    `
      SELECT goal_code, label, reward_description, target_value, current_value, reward_gems, reward_multiplier
      FROM community_goal_progress
      ORDER BY goal_code
    `
  );
  const communityGoalRows = communityGoalRowsResult.rows;

  const communityClaimsResult = await postgres.query(
    `
      SELECT goal_code
      FROM community_goal_reward_claims
      WHERE user_id = $1
    `,
    [userId]
  );
  const claimedGoals = new Set(communityClaimsResult.rows.map((row) => row.goal_code));

  const holidayGoal = communityGoalRows.find((row) => row.goal_code === HOLIDAY_GOAL_CODE) || null;
  const holidayGoalAchieved = holidayGoal
    ? Number(holidayGoal.current_value || 0) >= Number(holidayGoal.target_value || 0)
    : false;
  const holidayDoubleRewardsWeekendActive = holidayGoalAchieved && isWeekendUtc();
  const rewardMultiplier = holidayDoubleRewardsWeekendActive
    ? Math.max(1, Number(holidayGoal?.reward_multiplier || 2))
    : 1;

  return {
    user,
    todayCompletedCodes,
    weekStart,
    weeklyDailyQuestCount,
    weeklyCompletedCodes,
    seasonKey,
    seasonProgress,
    communityGoalRows,
    claimedGoals,
    holidayDoubleRewardsWeekendActive,
    rewardMultiplier
  };
}

router.get('/status', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  try {
    const status = await loadStatusSnapshot(req.user.id);
    if (!status) return fail(res, 404, 'USER_NOT_FOUND', 'User not found');

    const dailyQuests = DAILY_QUESTS.map((quest) => ({
      code: quest.code,
      label: quest.label,
      completed: status.todayCompletedCodes.includes(quest.code),
      rewards: {
        souls: quest.rewards.souls,
        gemDust: quest.rewards.gemDust,
        gems: quest.rewards.gems,
        chestChance: quest.rewards.chestChance
      }
    }));

    const weeklyQuests = WEEKLY_QUESTS.map((quest) => {
      const requirementMet = quest.requirement?.type === 'weekly_daily_quest_count'
        ? status.weeklyDailyQuestCount >= Number(quest.requirement.value || 0)
        : true;

      return {
        code: quest.code,
        label: quest.label,
        completed: status.weeklyCompletedCodes.has(quest.code),
        requirement: quest.requirement,
        requirementMet,
        rewards: quest.rewards
      };
    });

    const seasonCompletedCount = Number(status.seasonProgress.completed_count || 0);
    const seasonRewardClaimed = !!status.seasonProgress.reward_claimed;

    const communityGoals = status.communityGoalRows.map((goal) => {
      const targetValue = Number(goal.target_value || 0);
      const currentValue = Number(goal.current_value || 0);
      const achieved = currentValue >= targetValue;
      const rewardGems = Number(goal.reward_gems || 0);
      const claimable = achieved && rewardGems > 0 && !status.claimedGoals.has(goal.goal_code);

      return {
        code: goal.goal_code,
        label: goal.label,
        rewardDescription: goal.reward_description,
        targetValue,
        currentValue,
        achieved,
        rewardGems,
        rewardMultiplier: Number(goal.reward_multiplier || 1),
        claimed: status.claimedGoals.has(goal.goal_code),
        claimable
      };
    });

    return res.json({
      success: true,
      balances: {
        souls: Number(status.user.horror_coins || 0),
        gemDust: Number(status.user.gem_dust || 0),
        gems: Number(status.user.blood_gems || 0)
      },
      // Backwards-compatible fields used by existing UI.
      gemDust: Number(status.user.gem_dust || 0),
      daily: {
        date: new Date().toISOString().slice(0, 10),
        activities: dailyQuests.map((quest) => ({
          code: quest.code,
          label: quest.label,
          completed: quest.completed
        })),
        completedCount: dailyQuests.filter((quest) => quest.completed).length,
        totalCount: dailyQuests.length,
        activityReward: null,
        allCompleteBonus: 0,
        bonusClaimed: false,
        bonusEligible: false
      },
      weekly: {
        weekStart: status.weekStart,
        weekEnd: status.weekStart ? new Date(new Date(status.weekStart).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : null,
        activityScore: status.weeklyDailyQuestCount,
        threshold: 20,
        crateReward: 1000,
        claimEligible: status.weeklyDailyQuestCount >= 20,
        claimed: status.weeklyCompletedCodes.has('complete_20_daily_quests')
      },
      quests: {
        daily: dailyQuests,
        weekly: weeklyQuests,
        season: {
          code: SEASON_QUEST.code,
          label: SEASON_QUEST.label,
          seasonKey: status.seasonKey,
          completedCount: seasonCompletedCount,
          requiredCount: SEASON_QUEST.requiredCount,
          claimEligible: seasonCompletedCount >= SEASON_QUEST.requiredCount,
          rewardClaimed: seasonRewardClaimed,
          rewards: SEASON_QUEST.rewards
        }
      },
      tournamentRewards: Object.values(TOURNAMENT_REWARDS),
      communityGoals,
      eventModifiers: {
        holidayDoubleRewardsWeekendActive: status.holidayDoubleRewardsWeekendActive,
        rewardMultiplier: status.rewardMultiplier
      }
    });
  } catch (error) {
    return fail(res, 500, 'QUEST_STATUS_FAILED', 'Unable to load quest status');
  }
});

router.post('/activities/:activityCode/complete', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');
  }

  const activityCode = String(req.params.activityCode || '').trim();
  const quest = DAILY_QUEST_BY_CODE[activityCode];
  if (!quest) {
    return fail(res, 400, 'INVALID_ACTIVITY_CODE', 'activityCode is invalid');
  }

  try {
    const mutation = await executeIdempotentMutation({
      scope: 'daily_quest.complete',
      idempotencyKey,
      requestPayload: { userId: req.user.id, activityCode },
      actorUserId: req.user.id,
      targetUserId: req.user.id,
      entityType: 'daily_quest',
      eventType: 'daily_quest_complete',
      requestId: req.header('x-request-id') || null,
      perfChannel: 'daily.quest.complete',
      mutationFn: async () => {
        await ensureCommunityGoalsSeeded();
        await postgres.query('BEGIN');
        try {
          const userResult = await postgres.query(
            `
              SELECT id,
                     COALESCE(horror_coins, 0) AS horror_coins,
                     COALESCE(gem_dust, 0) AS gem_dust,
                     COALESCE(blood_gems, 0) AS blood_gems,
                     inventory
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

          const completionInsert = await postgres.query(
            `
              INSERT INTO daily_activity_progress (
                id,
                user_id,
                activity_code,
                activity_date,
                reward_granted,
                reward_amount,
                idempotency_key,
                metadata,
                completed_at,
                created_at,
                updated_at
              )
              VALUES ($1, $2, $3, CURRENT_DATE, TRUE, 0, $4, $5::jsonb, NOW(), NOW(), NOW())
              ON CONFLICT (user_id, activity_code, activity_date)
              DO NOTHING
              RETURNING id
            `,
            [
              makeId('dquest'),
              req.user.id,
              activityCode,
              idempotencyKey,
              JSON.stringify({
                questLabel: quest.label
              })
            ]
          );

          const newlyCompleted = completionInsert.rows.length > 0;

          let rewardGranted = { souls: 0, gemDust: 0, gems: 0 };
          let autoWeeklyQuestCompleted = false;
          let autoWeeklyRewardGranted = 0;
          let chestDrop = null;
          let rewardMultiplierApplied = 1;
          let currentSouls = Number(user.horror_coins || 0);
          let currentGemDust = Number(user.gem_dust || 0);
          let currentGems = Number(user.blood_gems || 0);
          let currentInventory = toInventory(user.inventory);
          let weeklyDailyQuestCount = 0;

          if (newlyCompleted) {
            rewardMultiplierApplied = await getHolidayRewardMultiplier();
            rewardGranted = normalizeQuestRewards(quest.rewards, rewardMultiplierApplied);

            if (quest.rewards.chestChance > 0 && Math.random() < Number(quest.rewards.chestChance)) {
              chestDrop = pickChestItem(quest.rewards.chestPool);
              if (chestDrop) currentInventory.push(chestDrop);
            }

            currentSouls += rewardGranted.souls;
            currentGemDust += rewardGranted.gemDust;
            currentGems += rewardGranted.gems;

            await postgres.query(
              `
                UPDATE users
                SET horror_coins = $2,
                    gem_dust = $3,
                    blood_gems = $4,
                    inventory = $5::jsonb,
                    updated_at = NOW()
                WHERE id = $1
              `,
              [
                req.user.id,
                currentSouls,
                currentGemDust,
                currentGems,
                JSON.stringify(currentInventory)
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
                reason: 'daily_quest_completion',
                activityCode,
                rewardMultiplierApplied,
                ...rewardGranted,
                chestDrop
              }
            });

            const weekStart = await getWeekStartDateUtc();
            weeklyDailyQuestCount = await getWeeklyDailyQuestCount(req.user.id, weekStart);

            if (weeklyDailyQuestCount >= 20) {
              const weeklyAutoInsert = await postgres.query(
                `
                  INSERT INTO weekly_quest_completions (
                    id,
                    user_id,
                    week_start_date,
                    quest_code,
                    reward_gems,
                    idempotency_key,
                    metadata,
                    completed_at,
                    created_at
                  )
                  VALUES ($1, $2, $3::date, $4, $5, $6, '{}'::jsonb, NOW(), NOW())
                  ON CONFLICT (user_id, week_start_date, quest_code)
                  DO NOTHING
                  RETURNING id
                `,
                [
                  makeId('wquest'),
                  req.user.id,
                  weekStart,
                  'complete_20_daily_quests',
                  WEEKLY_QUEST_BY_CODE.complete_20_daily_quests.rewards.gems,
                  idempotencyKey
                ]
              );

              if (weeklyAutoInsert.rows.length > 0) {
                autoWeeklyQuestCompleted = true;
                autoWeeklyRewardGranted = Math.floor(
                  Number(WEEKLY_QUEST_BY_CODE.complete_20_daily_quests.rewards.gems || 0) * rewardMultiplierApplied
                );
                currentGems += autoWeeklyRewardGranted;

                await postgres.query(
                  `
                    UPDATE users
                    SET blood_gems = $2,
                        updated_at = NOW()
                    WHERE id = $1
                  `,
                  [req.user.id, currentGems]
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
                    reason: 'weekly_quest_auto_completion',
                    questCode: 'complete_20_daily_quests',
                    gems: autoWeeklyRewardGranted,
                    rewardMultiplierApplied
                  }
                });
              }
            }
          } else {
            const weekStart = await getWeekStartDateUtc();
            weeklyDailyQuestCount = await getWeeklyDailyQuestCount(req.user.id, weekStart);
          }

          const dailyCountResult = await postgres.query(
            `
              SELECT COUNT(1)::int AS c
              FROM daily_activity_progress
              WHERE user_id = $1
                AND activity_date = CURRENT_DATE
            `,
            [req.user.id]
          );
          const completedCountToday = Number(dailyCountResult.rows[0]?.c || 0);

          await postgres.query('COMMIT');

          return {
            success: true,
            activityCode,
            newlyCompleted,
            rewardGranted,
            rewardMultiplierApplied,
            chestDropped: chestDrop,
            autoWeeklyQuestCompleted,
            autoWeeklyRewardGranted,
            completedCount: completedCountToday,
            requiredCount: DAILY_QUESTS.length,
            weeklyDailyQuestCount,
            balances: {
              souls: currentSouls,
              gemDust: currentGemDust,
              gems: currentGems
            },
            // Backwards-compatible fields used by existing UI/tests.
            activityRewardGranted: rewardGranted.gemDust,
            allCompleteBonusGranted: 0,
            gemDustBalance: currentGemDust,
            resourceType: 'daily_quest_completion',
            resourceId: `${req.user.id}:${new Date().toISOString().slice(0, 10)}:${activityCode}`
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
      USER_NOT_FOUND: 404
    };

    return fail(
      res,
      statusByCode[error.code] || 400,
      error.code || 'DAILY_QUEST_COMPLETE_FAILED',
      error.message || 'Unable to complete daily quest'
    );
  }
});

async function completeWeeklyQuest(req, res, questCode, { legacyAlias = false } = {}) {
  const quest = WEEKLY_QUEST_BY_CODE[questCode];
  if (!quest) {
    return fail(res, 400, 'INVALID_WEEKLY_QUEST_CODE', 'questCode is invalid');
  }

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');
  }

  try {
    const mutation = await executeIdempotentMutation({
      scope: 'weekly_quest.complete',
      idempotencyKey,
      requestPayload: { userId: req.user.id, questCode },
      actorUserId: req.user.id,
      targetUserId: req.user.id,
      entityType: 'weekly_quest',
      eventType: 'weekly_quest_complete',
      requestId: req.header('x-request-id') || null,
      perfChannel: 'weekly.quest.complete',
      mutationFn: async () => {
        await ensureCommunityGoalsSeeded();
        await postgres.query('BEGIN');
        try {
          const userResult = await postgres.query(
            `
              SELECT id, COALESCE(blood_gems, 0) AS blood_gems
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

          const weekStart = await getWeekStartDateUtc();
          const existing = await postgres.query(
            `
              SELECT id
              FROM weekly_quest_completions
              WHERE user_id = $1
                AND week_start_date = $2::date
                AND quest_code = $3
              LIMIT 1
            `,
            [req.user.id, weekStart, questCode]
          );
          if (existing.rows.length > 0) {
            const err = new Error('Weekly quest already completed');
            err.code = 'WEEKLY_QUEST_ALREADY_COMPLETED';
            throw err;
          }

          let weeklyDailyQuestCount = null;
          if (quest.requirement?.type === 'weekly_daily_quest_count') {
            weeklyDailyQuestCount = await getWeeklyDailyQuestCount(req.user.id, weekStart);
            if (weeklyDailyQuestCount < Number(quest.requirement.value || 0)) {
              const err = new Error('Weekly quest requirement not met');
              err.code = 'WEEKLY_QUEST_REQUIREMENT_NOT_MET';
              throw err;
            }
          }

          const rewardMultiplierApplied = await getHolidayRewardMultiplier();
          const gemsAwarded = Math.floor(Number(quest.rewards.gems || 0) * rewardMultiplierApplied);
          const nextGems = Number(user.blood_gems || 0) + gemsAwarded;

          await postgres.query(
            `
              INSERT INTO weekly_quest_completions (
                id,
                user_id,
                week_start_date,
                quest_code,
                reward_gems,
                idempotency_key,
                metadata,
                completed_at,
                created_at
              )
              VALUES ($1, $2, $3::date, $4, $5, $6, '{}'::jsonb, NOW(), NOW())
            `,
            [
              makeId('wquest'),
              req.user.id,
              weekStart,
              questCode,
              gemsAwarded,
              idempotencyKey
            ]
          );

          await postgres.query(
            `
              UPDATE users
              SET blood_gems = $2,
                  updated_at = NOW()
              WHERE id = $1
            `,
            [req.user.id, nextGems]
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
              reason: 'weekly_quest_completion',
              questCode,
              rewardMultiplierApplied,
              gems: gemsAwarded
            }
          });

          await postgres.query('COMMIT');

          return {
            success: true,
            questCode,
            weekStart,
            rewardMultiplierApplied,
            gemsAwarded,
            gemsBalance: nextGems,
            weeklyDailyQuestCount,
            resourceType: 'weekly_quest_completion',
            resourceId: `${req.user.id}:${weekStart}:${questCode}`
          };
        } catch (error) {
          await postgres.query('ROLLBACK');
          throw error;
        }
      }
    });

    const payload = {
      success: true,
      ...mutation.responseBody,
      replayed: mutation.replayed
    };

    if (legacyAlias) {
      payload.gemDustAwarded = 0;
      payload.threshold = 20;
      payload.activityScore = Number(payload.weeklyDailyQuestCount || 0);
    }

    return res.status(mutation.replayed ? 200 : 201).json(payload);
  } catch (error) {
    if (error.code === 'IDEMPOTENCY_PAYLOAD_MISMATCH') {
      return fail(res, 409, error.code, 'Idempotency key already used with different payload');
    }
    if (error.code === 'IDEMPOTENCY_IN_PROGRESS') {
      return fail(res, 409, error.code, 'Request with this idempotency key is currently in progress');
    }

    const statusByCode = {
      USER_NOT_FOUND: 404,
      WEEKLY_QUEST_ALREADY_COMPLETED: 409,
      WEEKLY_QUEST_REQUIREMENT_NOT_MET: 409
    };

    const errorMessages = {
      USER_NOT_FOUND: 'User not found',
      WEEKLY_QUEST_ALREADY_COMPLETED: 'Weekly quest already completed',
      WEEKLY_QUEST_REQUIREMENT_NOT_MET: 'Weekly quest requirement not met'
    };

    return fail(
      res,
      statusByCode[error.code] || 400,
      error.code || 'WEEKLY_QUEST_COMPLETE_FAILED',
      errorMessages[error.code] || 'Unable to complete weekly quest'
    );
  }
}

router.post('/weekly-quests/:questCode/complete', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  const questCode = String(req.params.questCode || '').trim();
  return completeWeeklyQuest(req, res, questCode);
});

// Backwards-compatible alias for older client flow.
router.post('/weekly-crate/claim', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;
  return completeWeeklyQuest(req, res, 'complete_20_daily_quests', { legacyAlias: true });
});

router.post('/season-quests/progress', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');
  }

  const questCode = typeof req.body?.questCode === 'string' ? req.body.questCode.trim().slice(0, 120) : '';
  if (!questCode) {
    return fail(res, 400, 'INVALID_QUEST_CODE', 'questCode is required');
  }

  try {
    const mutation = await executeIdempotentMutation({
      scope: 'season_quest.progress',
      idempotencyKey,
      requestPayload: { userId: req.user.id, questCode },
      actorUserId: req.user.id,
      targetUserId: req.user.id,
      entityType: 'season_quest_progress',
      eventType: 'season_quest_progress',
      requestId: req.header('x-request-id') || null,
      perfChannel: 'season.quest.progress',
      mutationFn: async () => {
        const seasonKey = getCurrentSeasonKey();

        await postgres.query('BEGIN');
        try {
          const eventInsert = await postgres.query(
            `
              INSERT INTO season_quest_progress_events (
                id,
                user_id,
                season_key,
                quest_code,
                idempotency_key,
                metadata,
                completed_at,
                created_at
              )
              VALUES ($1, $2, $3, $4, $5, '{}'::jsonb, NOW(), NOW())
              ON CONFLICT (user_id, season_key, quest_code)
              DO NOTHING
              RETURNING id
            `,
            [makeId('sqevt'), req.user.id, seasonKey, questCode, idempotencyKey]
          );

          const newlyCounted = eventInsert.rows.length > 0;

          let progressRow = null;
          if (newlyCounted) {
            const upsertProgress = await postgres.query(
              `
                INSERT INTO season_quest_progress (
                  id,
                  user_id,
                  season_key,
                  completed_count,
                  reward_claimed,
                  metadata,
                  created_at,
                  updated_at
                )
                VALUES ($1, $2, $3, 1, FALSE, '{}'::jsonb, NOW(), NOW())
                ON CONFLICT (user_id, season_key)
                DO UPDATE SET
                  completed_count = season_quest_progress.completed_count + 1,
                  updated_at = NOW()
                RETURNING completed_count, reward_claimed
              `,
              [makeId('sqprog'), req.user.id, seasonKey]
            );
            progressRow = upsertProgress.rows[0];
          } else {
            const existing = await postgres.query(
              `
                SELECT completed_count, reward_claimed
                FROM season_quest_progress
                WHERE user_id = $1
                  AND season_key = $2
                LIMIT 1
              `,
              [req.user.id, seasonKey]
            );
            progressRow = existing.rows[0] || { completed_count: 0, reward_claimed: false };
          }

          await postgres.query('COMMIT');

          const completedCount = Number(progressRow?.completed_count || 0);
          return {
            success: true,
            questCode,
            seasonKey,
            newlyCounted,
            completedCount,
            requiredCount: SEASON_QUEST.requiredCount,
            claimEligible: completedCount >= SEASON_QUEST.requiredCount,
            rewardClaimed: !!progressRow?.reward_claimed,
            resourceType: 'season_quest_progress',
            resourceId: `${req.user.id}:${seasonKey}`
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

    return fail(
      res,
      400,
      error.code || 'SEASON_QUEST_PROGRESS_FAILED',
      error.message || 'Unable to update season quest progress'
    );
  }
});

router.post('/season-quests/claim', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');
  }

  try {
    const mutation = await executeIdempotentMutation({
      scope: 'season_quest.claim',
      idempotencyKey,
      requestPayload: { userId: req.user.id, seasonQuestCode: SEASON_QUEST.code },
      actorUserId: req.user.id,
      targetUserId: req.user.id,
      entityType: 'season_quest_claim',
      eventType: 'season_quest_claim',
      requestId: req.header('x-request-id') || null,
      perfChannel: 'season.quest.claim',
      mutationFn: async () => {
        await ensureCommunityGoalsSeeded();

        await postgres.query('BEGIN');
        try {
          const seasonKey = getCurrentSeasonKey();

          const userResult = await postgres.query(
            `
              SELECT id,
                     COALESCE(blood_gems, 0) AS blood_gems,
                     inventory
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

          const progressResult = await postgres.query(
            `
              SELECT completed_count, reward_claimed
              FROM season_quest_progress
              WHERE user_id = $1
                AND season_key = $2
              LIMIT 1
              FOR UPDATE
            `,
            [req.user.id, seasonKey]
          );
          const progress = progressResult.rows[0];
          if (!progress || Number(progress.completed_count || 0) < SEASON_QUEST.requiredCount) {
            const err = new Error('Season quest requirement not met');
            err.code = 'SEASON_QUEST_REQUIREMENT_NOT_MET';
            throw err;
          }
          if (progress.reward_claimed) {
            const err = new Error('Season quest reward already claimed');
            err.code = 'SEASON_QUEST_ALREADY_CLAIMED';
            throw err;
          }

          const rewardMultiplierApplied = await getHolidayRewardMultiplier();
          const gemsAwarded = Math.floor(Number(SEASON_QUEST.rewards.gems || 0) * rewardMultiplierApplied);
          const nextGems = Number(user.blood_gems || 0) + gemsAwarded;
          const nextInventory = toInventory(user.inventory);
          nextInventory.push(SEASON_QUEST.rewards.exclusiveSkin);

          await postgres.query(
            `
              UPDATE users
              SET blood_gems = $2,
                  inventory = $3::jsonb,
                  updated_at = NOW()
              WHERE id = $1
            `,
            [req.user.id, nextGems, JSON.stringify(nextInventory)]
          );

          await postgres.query(
            `
              UPDATE season_quest_progress
              SET reward_claimed = TRUE,
                  reward_claimed_at = NOW(),
                  updated_at = NOW()
              WHERE user_id = $1
                AND season_key = $2
            `,
            [req.user.id, seasonKey]
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
              reason: 'season_quest_claim',
              seasonKey,
              gems: gemsAwarded,
              exclusiveSkin: SEASON_QUEST.rewards.exclusiveSkin,
              rewardMultiplierApplied
            }
          });

          await postgres.query('COMMIT');

          return {
            success: true,
            seasonKey,
            seasonQuestCode: SEASON_QUEST.code,
            rewardMultiplierApplied,
            gemsAwarded,
            exclusiveSkin: SEASON_QUEST.rewards.exclusiveSkin,
            gemsBalance: nextGems,
            resourceType: 'season_quest_claim',
            resourceId: `${req.user.id}:${seasonKey}`
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
      SEASON_QUEST_REQUIREMENT_NOT_MET: 409,
      SEASON_QUEST_ALREADY_CLAIMED: 409
    };

    const errorMessages = {
      USER_NOT_FOUND: 'User not found',
      SEASON_QUEST_REQUIREMENT_NOT_MET: 'Complete all 15 seasonal quests before claiming',
      SEASON_QUEST_ALREADY_CLAIMED: 'Season quest reward already claimed'
    };

    return fail(
      res,
      statusByCode[error.code] || 400,
      error.code || 'SEASON_QUEST_CLAIM_FAILED',
      errorMessages[error.code] || 'Unable to claim season quest reward'
    );
  }
});

router.post('/tournament/claim', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');
  }

  const tournamentId = typeof req.body?.tournamentId === 'string' ? req.body.tournamentId.trim().slice(0, 120) : '';
  const tier = typeof req.body?.tier === 'string' ? req.body.tier.trim() : '';
  const tierConfig = TOURNAMENT_REWARDS[tier];

  if (!tournamentId) return fail(res, 400, 'INVALID_TOURNAMENT_ID', 'tournamentId is required');
  if (!tierConfig) return fail(res, 400, 'INVALID_TOURNAMENT_TIER', 'tier is invalid');

  try {
    const mutation = await executeIdempotentMutation({
      scope: 'tournament_reward.claim',
      idempotencyKey,
      requestPayload: { userId: req.user.id, tournamentId, tier },
      actorUserId: req.user.id,
      targetUserId: req.user.id,
      entityType: 'tournament_reward_claim',
      eventType: 'tournament_reward_claim',
      requestId: req.header('x-request-id') || null,
      perfChannel: 'tournament.reward.claim',
      mutationFn: async () => {
        await ensureCommunityGoalsSeeded();

        await postgres.query('BEGIN');
        try {
          const userResult = await postgres.query(
            `
              SELECT id,
                     COALESCE(horror_coins, 0) AS horror_coins,
                     COALESCE(blood_gems, 0) AS blood_gems,
                     inventory
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

          const claimInsert = await postgres.query(
            `
              INSERT INTO tournament_participation_rewards (
                id,
                user_id,
                tournament_id,
                reward_tier,
                souls_awarded,
                gems_awarded,
                reward_items,
                idempotency_key,
                metadata,
                claimed_at,
                created_at
              )
              VALUES ($1, $2, $3, $4, 0, 0, '[]'::jsonb, $5, '{}'::jsonb, NOW(), NOW())
              ON CONFLICT (user_id, tournament_id)
              DO NOTHING
              RETURNING id
            `,
            [makeId('tourrw'), req.user.id, tournamentId, tierConfig.tier, idempotencyKey]
          );
          if (claimInsert.rows.length === 0) {
            const err = new Error('Tournament reward already claimed for this tournament');
            err.code = 'TOURNAMENT_REWARD_ALREADY_CLAIMED';
            throw err;
          }

          const rewardMultiplierApplied = await getHolidayRewardMultiplier();
          const soulsAwarded = Math.floor(Number(tierConfig.souls || 0) * rewardMultiplierApplied);
          const gemsAwarded = Math.floor(Number(tierConfig.gems || 0) * rewardMultiplierApplied);

          const rewardItems = [];
          const nextInventory = toInventory(user.inventory);
          if (tierConfig.itemKey) {
            rewardItems.push({
              itemKey: tierConfig.itemKey,
              itemType: tierConfig.itemType
            });
            nextInventory.push(tierConfig.itemKey);
          }

          const nextSouls = Number(user.horror_coins || 0) + soulsAwarded;
          const nextGems = Number(user.blood_gems || 0) + gemsAwarded;

          await postgres.query(
            `
              UPDATE users
              SET horror_coins = $2,
                  blood_gems = $3,
                  inventory = $4::jsonb,
                  updated_at = NOW()
              WHERE id = $1
            `,
            [req.user.id, nextSouls, nextGems, JSON.stringify(nextInventory)]
          );

          await postgres.query(
            `
              UPDATE tournament_participation_rewards
              SET souls_awarded = $3,
                  gems_awarded = $4,
                  reward_items = $5::jsonb
              WHERE user_id = $1
                AND tournament_id = $2
            `,
            [req.user.id, tournamentId, soulsAwarded, gemsAwarded, JSON.stringify(rewardItems)]
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
              reason: 'tournament_reward_claim',
              tournamentId,
              tier,
              rewardMultiplierApplied,
              souls: soulsAwarded,
              gems: gemsAwarded,
              rewardItems
            }
          });

          await postgres.query('COMMIT');

          return {
            success: true,
            tournamentId,
            tier,
            rewardMultiplierApplied,
            soulsAwarded,
            gemsAwarded,
            rewardItems,
            balances: {
              souls: nextSouls,
              gems: nextGems
            },
            resourceType: 'tournament_reward_claim',
            resourceId: `${req.user.id}:${tournamentId}`
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
      TOURNAMENT_REWARD_ALREADY_CLAIMED: 409
    };

    const errorMessages = {
      USER_NOT_FOUND: 'User not found',
      TOURNAMENT_REWARD_ALREADY_CLAIMED: 'Tournament reward already claimed for this tournament'
    };

    return fail(
      res,
      statusByCode[error.code] || 400,
      error.code || 'TOURNAMENT_REWARD_CLAIM_FAILED',
      errorMessages[error.code] || 'Unable to claim tournament reward'
    );
  }
});

router.get('/community-goals', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  try {
    await ensureCommunityGoalsSeeded();

    const goalsResult = await postgres.query(
      `
        SELECT goal_code, label, reward_description, target_value, current_value, reward_gems, reward_multiplier
        FROM community_goal_progress
        ORDER BY goal_code
      `
    );

    const claimsResult = await postgres.query(
      `
        SELECT goal_code
        FROM community_goal_reward_claims
        WHERE user_id = $1
      `,
      [req.user.id]
    );
    const claimed = new Set(claimsResult.rows.map((row) => row.goal_code));

    const goals = goalsResult.rows.map((row) => {
      const targetValue = Number(row.target_value || 0);
      const currentValue = Number(row.current_value || 0);
      const achieved = currentValue >= targetValue;
      const rewardGems = Number(row.reward_gems || 0);

      return {
        code: row.goal_code,
        label: row.label,
        rewardDescription: row.reward_description,
        targetValue,
        currentValue,
        achieved,
        rewardGems,
        rewardMultiplier: Number(row.reward_multiplier || 1),
        claimed: claimed.has(row.goal_code),
        claimable: achieved && rewardGems > 0 && !claimed.has(row.goal_code)
      };
    });

    const holidayGoal = goals.find((goal) => goal.code === HOLIDAY_GOAL_CODE) || null;

    return res.json({
      success: true,
      goals,
      holidayDoubleRewardsWeekendActive: !!(holidayGoal && holidayGoal.achieved && isWeekendUtc()),
      rewardMultiplier: holidayGoal && holidayGoal.achieved && isWeekendUtc()
        ? Math.max(1, Number(holidayGoal.rewardMultiplier || 1))
        : 1
    });
  } catch (error) {
    return fail(res, 500, 'COMMUNITY_GOALS_STATUS_FAILED', 'Unable to load community goals');
  }
});

router.post('/community-goals/:goalCode/contribute', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');
  }

  const goalCode = String(req.params.goalCode || '').trim();
  const goalDef = COMMUNITY_GOAL_BY_CODE[goalCode];
  if (!goalDef) return fail(res, 400, 'INVALID_COMMUNITY_GOAL_CODE', 'goalCode is invalid');

  const requestedAmount = parsePositiveInt(req.body?.amount, 1);
  const amount = Math.min(Math.max(requestedAmount, 1), 1000000);

  try {
    const mutation = await executeIdempotentMutation({
      scope: 'community_goal.contribute',
      idempotencyKey,
      requestPayload: { userId: req.user.id, goalCode, amount },
      actorUserId: req.user.id,
      targetUserId: req.user.id,
      entityType: 'community_goal_progress',
      eventType: 'community_goal_contribute',
      requestId: req.header('x-request-id') || null,
      perfChannel: 'community.goal.contribute',
      mutationFn: async () => {
        await postgres.query('BEGIN');
        try {
          await ensureCommunityGoalsSeeded();

          const goalResult = await postgres.query(
            `
              SELECT goal_code, target_value, current_value, reward_multiplier
              FROM community_goal_progress
              WHERE goal_code = $1
              LIMIT 1
              FOR UPDATE
            `,
            [goalCode]
          );
          const goal = goalResult.rows[0];
          if (!goal) {
            const err = new Error('Community goal not found');
            err.code = 'COMMUNITY_GOAL_NOT_FOUND';
            throw err;
          }

          const targetValue = Number(goal.target_value || 0);
          const currentValue = Number(goal.current_value || 0);
          const nextValue = Math.min(targetValue, currentValue + amount);

          await postgres.query(
            `
              UPDATE community_goal_progress
              SET current_value = $2,
                  updated_at = NOW()
              WHERE goal_code = $1
            `,
            [goalCode, nextValue]
          );

          await postgres.query('COMMIT');

          const achieved = nextValue >= targetValue;
          return {
            success: true,
            goalCode,
            amountContributed: amount,
            targetValue,
            currentValue: nextValue,
            achieved,
            holidayDoubleRewardsWeekendActive: goalCode === HOLIDAY_GOAL_CODE && achieved && isWeekendUtc(),
            rewardMultiplier: achieved ? Math.max(1, Number(goal.reward_multiplier || 1)) : 1,
            resourceType: 'community_goal_progress',
            resourceId: goalCode
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

    return fail(
      res,
      error.code === 'COMMUNITY_GOAL_NOT_FOUND' ? 404 : 400,
      error.code || 'COMMUNITY_GOAL_CONTRIBUTE_FAILED',
      error.message || 'Unable to contribute to community goal'
    );
  }
});

router.post('/community-goals/:goalCode/claim', authMiddleware, async (req, res) => {
  if (!ensurePg(res)) return;

  const idempotencyKey = getIdempotencyKey(req);
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return fail(res, 400, 'IDEMPOTENCY_KEY_REQUIRED', 'idempotency-key header is required');
  }

  const goalCode = String(req.params.goalCode || '').trim();
  const goalDef = COMMUNITY_GOAL_BY_CODE[goalCode];
  if (!goalDef) return fail(res, 400, 'INVALID_COMMUNITY_GOAL_CODE', 'goalCode is invalid');

  if (Number(goalDef.rewardGems || 0) <= 0) {
    return fail(res, 409, 'COMMUNITY_GOAL_NOT_CLAIMABLE', 'This community goal does not grant a direct claim reward');
  }

  try {
    const mutation = await executeIdempotentMutation({
      scope: 'community_goal.claim',
      idempotencyKey,
      requestPayload: { userId: req.user.id, goalCode },
      actorUserId: req.user.id,
      targetUserId: req.user.id,
      entityType: 'community_goal_reward_claim',
      eventType: 'community_goal_claim',
      requestId: req.header('x-request-id') || null,
      perfChannel: 'community.goal.claim',
      mutationFn: async () => {
        await postgres.query('BEGIN');
        try {
          await ensureCommunityGoalsSeeded();

          const goalResult = await postgres.query(
            `
              SELECT goal_code, target_value, current_value, reward_gems
              FROM community_goal_progress
              WHERE goal_code = $1
              LIMIT 1
              FOR UPDATE
            `,
            [goalCode]
          );
          const goal = goalResult.rows[0];
          if (!goal) {
            const err = new Error('Community goal not found');
            err.code = 'COMMUNITY_GOAL_NOT_FOUND';
            throw err;
          }

          const achieved = Number(goal.current_value || 0) >= Number(goal.target_value || 0);
          if (!achieved) {
            const err = new Error('Community goal not yet achieved');
            err.code = 'COMMUNITY_GOAL_NOT_ACHIEVED';
            throw err;
          }

          const claimInsert = await postgres.query(
            `
              INSERT INTO community_goal_reward_claims (
                id,
                user_id,
                goal_code,
                reward_gems,
                idempotency_key,
                metadata,
                claimed_at,
                created_at
              )
              VALUES ($1, $2, $3, $4, $5, '{}'::jsonb, NOW(), NOW())
              ON CONFLICT (user_id, goal_code)
              DO NOTHING
              RETURNING id
            `,
            [makeId('cgoalc'), req.user.id, goalCode, Number(goal.reward_gems || 0), idempotencyKey]
          );
          if (claimInsert.rows.length === 0) {
            const err = new Error('Community goal reward already claimed');
            err.code = 'COMMUNITY_GOAL_ALREADY_CLAIMED';
            throw err;
          }

          const userResult = await postgres.query(
            `
              SELECT id, COALESCE(blood_gems, 0) AS blood_gems
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

          const gemsAwarded = Number(goal.reward_gems || 0);
          const nextGems = Number(user.blood_gems || 0) + gemsAwarded;

          await postgres.query(
            `
              UPDATE users
              SET blood_gems = $2,
                  updated_at = NOW()
              WHERE id = $1
            `,
            [req.user.id, nextGems]
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
              reason: 'community_goal_claim',
              goalCode,
              gems: gemsAwarded
            }
          });

          await postgres.query('COMMIT');

          return {
            success: true,
            goalCode,
            gemsAwarded,
            gemsBalance: nextGems,
            resourceType: 'community_goal_reward_claim',
            resourceId: `${req.user.id}:${goalCode}`
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
      COMMUNITY_GOAL_NOT_FOUND: 404,
      COMMUNITY_GOAL_NOT_ACHIEVED: 409,
      COMMUNITY_GOAL_ALREADY_CLAIMED: 409
    };

    const errorMessages = {
      USER_NOT_FOUND: 'User not found',
      COMMUNITY_GOAL_NOT_FOUND: 'Community goal not found',
      COMMUNITY_GOAL_NOT_ACHIEVED: 'Community goal not yet achieved',
      COMMUNITY_GOAL_ALREADY_CLAIMED: 'Community goal reward already claimed'
    };

    return fail(
      res,
      statusByCode[error.code] || 400,
      error.code || 'COMMUNITY_GOAL_CLAIM_FAILED',
      errorMessages[error.code] || 'Unable to claim community goal reward'
    );
  }
});

module.exports = router;
