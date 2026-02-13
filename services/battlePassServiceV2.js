/**
 * Battle Pass Service V2 (Phase 5.2)
 * Season-aware progression, quests, bonus/repeatable tiers,
 * team contribution caps, and retroactive explicit claims.
 */

const dataAccess = require('../models/data-access');
const postgres = require('../models/postgres');
const { appendAuditEvent, makeId } = require('./economyMutationService');

function assertPostgresEnabled() {
  if (!postgres.isEnabled()) {
    const err = new Error('Battle Pass V2 requires PostgreSQL');
    err.code = 'BP_V2_REQUIRES_POSTGRES';
    throw err;
  }
}

function toPositiveInt(value, fieldName, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    const err = new Error(`${fieldName} must be between ${min} and ${max}`);
    err.code = `INVALID_${fieldName.toUpperCase()}`;
    throw err;
  }
  return parsed;
}

function toTierFromXp(xp, xpPerTier) {
  return Math.floor(Math.max(0, xp) / Math.max(1, xpPerTier)) + 1;
}

function dayBucket(date) {
  return date.toISOString().slice(0, 10);
}

function weekBucket(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstThursdayDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDay + 3);
  const weekNo = 1 + Math.round((d - firstThursday) / (7 * 24 * 60 * 60 * 1000));
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

class BattlePassServiceV2 {
  async getSeasonByKeyOrActive(seasonKey = null) {
    assertPostgresEnabled();

    if (typeof seasonKey === 'string' && seasonKey.trim()) {
      const result = await postgres.query(
        `
          SELECT *
          FROM battle_pass_seasons
          WHERE season_key = $1
          LIMIT 1
        `,
        [seasonKey.trim()]
      );

      if (result.rows[0]) return result.rows[0];
      const err = new Error('Season not found');
      err.code = 'SEASON_NOT_FOUND';
      throw err;
    }

    const season = await dataAccess.getActiveBattlePassSeason();
    if (!season) {
      const err = new Error('No active battle pass season');
      err.code = 'NO_ACTIVE_SEASON';
      throw err;
    }

    return season;
  }

  async ensureProgress(seasonId, userId) {
    let progress = await dataAccess.getBattlePassUserProgress(seasonId, userId);
    if (!progress) {
      progress = await dataAccess.ensureBattlePassUserProgress({
        id: makeId('bp_prog'),
        seasonId,
        userId
      });
    }
    return progress;
  }

  normalizeTierReward(season, tierNumber, dbTier) {
    if (dbTier) {
      return {
        tierNumber,
        rewardType: dbTier.reward_type,
        rewardName: dbTier.reward_name,
        rewardAmount: dbTier.reward_amount || 0,
        rewardTier: dbTier.reward_tier || 'common',
        metadata: dbTier.metadata || {}
      };
    }

    const baseCap = Math.max(1, parseInt(season?.max_base_tier || 300, 10));
    const bonusCap = Math.max(baseCap, parseInt(season?.max_bonus_tier || 300, 10));
    const configuredCap = Math.max(300, bonusCap);

    if (tierNumber >= 101 && tierNumber <= configuredCap) {
      if (tierNumber % 50 === 0) {
        return {
          tierNumber,
          rewardType: 'mythic_item',
          rewardName: `Mythic Relic Tier ${tierNumber}`,
          rewardAmount: 1,
          rewardTier: 'mythic',
          metadata: {
            generated: true,
            scaledSeason: true,
            bonusTier: tierNumber > baseCap
          }
        };
      }

      if (tierNumber % 25 === 0) {
        return {
          tierNumber,
          rewardType: 'title',
          rewardName: `Nightmare Conqueror ${tierNumber}`,
          rewardAmount: 1,
          rewardTier: 'legendary',
          metadata: {
            generated: true,
            scaledSeason: true,
            bonusTier: tierNumber > baseCap
          }
        };
      }

      return {
        tierNumber,
        rewardType: 'currency',
        rewardName: `Tier ${tierNumber} Horror Coins`,
        rewardAmount: Math.max(25, parseInt(season.repeatable_currency_amount || 25, 10)) + Math.floor(tierNumber / 8),
        rewardTier: tierNumber % 10 === 0 ? 'epic' : 'rare',
        metadata: {
          generated: true,
          scaledSeason: true,
          bonusTier: tierNumber > baseCap
        }
      };
    }

    if (tierNumber > configuredCap) {
      return {
        tierNumber,
        rewardType: 'currency',
        rewardName: `Repeatable Tier ${tierNumber} Currency`,
        rewardAmount: Math.max(0, parseInt(season.repeatable_currency_amount || 0, 10)),
        rewardTier: 'repeatable',
        metadata: { generated: true, repeatable: true }
      };
    }

    return null;
  }

  async applyRewardToUser(userId, reward) {
    if (reward.rewardType === 'currency') {
      await postgres.query(
        `
          UPDATE users
          SET horror_coins = COALESCE(horror_coins, 0) + $2,
              updated_at = NOW()
          WHERE id = $1
        `,
        [userId, reward.rewardAmount || 0]
      );
      return;
    }

    if (reward.rewardType === 'title') {
      await postgres.query(
        `
          UPDATE users
          SET title = $2,
              updated_at = NOW()
          WHERE id = $1
        `,
        [userId, reward.rewardName]
      );
      return;
    }

    await postgres.query(
      `
        UPDATE users
        SET inventory = COALESCE(inventory, '[]'::jsonb) || jsonb_build_array($2::jsonb),
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        userId,
        JSON.stringify({
          type: reward.rewardType,
          name: reward.rewardName,
          tier: reward.rewardTier,
          amount: reward.rewardAmount || 0,
          acquiredAt: new Date().toISOString(),
          source: 'battle_pass_v2'
        })
      ]
    );
  }

  async getBattlePassState(userId, { seasonKey = null } = {}) {
    const season = await this.getSeasonByKeyOrActive(seasonKey);
    const progress = await this.ensureProgress(season.id, userId);
    const quests = await dataAccess.listBattlePassQuests(season.id);
    const claims = await dataAccess.listBattlePassClaims(season.id, userId);
    const retroClaims = await dataAccess.listBattlePassRetroactiveClaims(season.id, userId);

    const claimedTiers = new Set([
      ...claims.map((c) => c.tier_number),
      ...retroClaims.map((c) => c.tier_number)
    ]);

    const currentTier = toTierFromXp(progress.xp, season.base_xp_per_tier);

    return {
      season: {
        id: season.id,
        key: season.season_key,
        name: season.name,
        startsAt: season.starts_at,
        endsAt: season.ends_at,
        maxBaseTier: season.max_base_tier,
        maxBonusTier: season.max_bonus_tier,
        repeatableCurrencyAmount: season.repeatable_currency_amount,
        teamDailyContributionCap: season.team_daily_contribution_cap,
        baseXpPerTier: season.base_xp_per_tier
      },
      progress: {
        xp: Number(progress.xp || 0),
        level: currentTier,
        currentTier,
        xpIntoTier: Number(progress.xp || 0) % season.base_xp_per_tier,
        xpPerTier: season.base_xp_per_tier
      },
      claims: {
        tiersClaimed: [...claimedTiers].sort((a, b) => a - b),
        totalClaims: claims.length + retroClaims.length
      },
      access: {
        coveredBySeasonPass: !!(await dataAccess.getSeasonPassCoverage(userId, new Date(season.starts_at).getUTCFullYear()))
      },
      quests: quests.map((q) => ({
        id: q.id,
        code: q.quest_code,
        kind: q.quest_kind,
        eventType: q.event_type,
        requiredCount: q.required_count,
        xpReward: q.xp_reward,
        isRepeatable: q.is_repeatable,
        startsAt: q.starts_at,
        endsAt: q.ends_at
      }))
    };
  }

  async ingestQuestEvent(userId, {
    seasonKey = null,
    eventType,
    eventValue = 1,
    source = null,
    occurredAt = null,
    metadata = {},
    requestId = null,
    idempotencyKey = null
  }) {
    const season = await this.getSeasonByKeyOrActive(seasonKey);

    if (typeof eventType !== 'string' || !/^[A-Z0-9_]{3,64}$/.test(eventType)) {
      const err = new Error('Invalid quest event type');
      err.code = 'INVALID_EVENT_TYPE';
      throw err;
    }

    const normalizedValue = toPositiveInt(eventValue, 'eventValue', 1, 5000);
    const eventDate = occurredAt ? new Date(occurredAt) : new Date();
    if (Number.isNaN(eventDate.getTime())) {
      const err = new Error('Invalid occurredAt timestamp');
      err.code = 'INVALID_OCCURRED_AT';
      throw err;
    }

    if (eventDate.getTime() > Date.now() + 5 * 60 * 1000) {
      const err = new Error('Event timestamp is too far in the future');
      err.code = 'EVENT_TIME_IN_FUTURE';
      throw err;
    }

    const progress = await this.ensureProgress(season.id, userId);

    await dataAccess.createBattlePassEvent({
      id: makeId('bp_evt'),
      seasonId: season.id,
      userId,
      eventType,
      eventValue: normalizedValue,
      source,
      metadata,
      occurredAt: eventDate.toISOString()
    });

    const quests = (await dataAccess.listBattlePassQuests(season.id)).filter((q) => q.event_type === eventType);

    let totalAwardedXp = 0;
    const completedQuests = [];

    for (const quest of quests) {
      const startsAt = quest.starts_at ? new Date(quest.starts_at) : null;
      const endsAt = quest.ends_at ? new Date(quest.ends_at) : null;
      if (startsAt && eventDate < startsAt) continue;
      if (endsAt && eventDate > endsAt) continue;

      let bucket = 'all';
      if (quest.quest_kind === 'daily') bucket = dayBucket(eventDate);
      if (quest.quest_kind === 'weekly') bucket = weekBucket(eventDate);

      const existing = await dataAccess.getBattlePassQuestCompletion(season.id, userId, quest.id, bucket);
      const prev = existing ? Number(existing.progress_count || 0) : 0;
      const nextProgress = prev + normalizedValue;

      const reachedNow = prev < quest.required_count && nextProgress >= quest.required_count;
      const xpAwarded = existing ? Number(existing.xp_awarded || 0) : 0;
      const newXpAwarded = reachedNow ? Number(quest.xp_reward || 0) : xpAwarded;

      await dataAccess.upsertBattlePassQuestCompletion({
        id: existing?.id || makeId('bp_qc'),
        seasonId: season.id,
        userId,
        questId: quest.id,
        completionBucket: bucket,
        progressCount: Math.min(nextProgress, quest.required_count),
        xpAwarded: newXpAwarded,
        metadata: {
          source,
          questCode: quest.quest_code,
          idempotencyKey,
          requestId
        },
        completedAt: eventDate.toISOString()
      });

      if (reachedNow) {
        totalAwardedXp += Number(quest.xp_reward || 0);
        completedQuests.push({
          questId: quest.id,
          questCode: quest.quest_code,
          bucket,
          xpReward: Number(quest.xp_reward || 0)
        });
      }
    }

    let updatedProgress = progress;
    let appliedMultiplier = 1;
    let awardedXpFinal = totalAwardedXp;

    if (totalAwardedXp > 0) {
      try {
        appliedMultiplier = await dataAccess.getEffectiveXpBoosterMultiplier(userId, eventDate.toISOString());
      } catch (_) {
        appliedMultiplier = 1;
      }

      const safeMultiplier = Number.isFinite(appliedMultiplier) && appliedMultiplier >= 1 ? appliedMultiplier : 1;
      awardedXpFinal = Math.max(totalAwardedXp, Math.floor(totalAwardedXp * safeMultiplier));

      const updatedXp = Number(progress.xp || 0) + awardedXpFinal;
      const updatedLevel = toTierFromXp(updatedXp, season.base_xp_per_tier);
      updatedProgress = await dataAccess.updateBattlePassUserProgress({
        seasonId: season.id,
        userId,
        xp: updatedXp,
        level: updatedLevel,
        lastEventAt: eventDate.toISOString()
      });

      await appendAuditEvent({
        actorUserId: userId,
        targetUserId: userId,
        entityType: 'battle_pass_progress',
        entityId: updatedProgress?.id || null,
        eventType: 'battle_pass.quest_xp_awarded',
        requestId,
        idempotencyKey,
        metadata: {
          seasonId: season.id,
          eventType,
          completedQuests,
          awardedXpBase: totalAwardedXp,
          appliedMultiplier: safeMultiplier,
          awardedXpFinal
        }
      });
    }

    return {
      seasonId: season.id,
      eventType,
      eventValue: normalizedValue,
      completedQuests,
      xpAwarded: awardedXpFinal,
      xpAwardedBase: totalAwardedXp,
      xpMultiplierApplied: appliedMultiplier,
      newXpTotal: Number(updatedProgress?.xp || progress.xp || 0),
      newTier: toTierFromXp(Number(updatedProgress?.xp || progress.xp || 0), season.base_xp_per_tier)
    };
  }

  async claimTierReward(userId, {
    seasonKey = null,
    tierNumber,
    requestId = null,
    idempotencyKey = null,
    claimType = 'tier'
  }) {
    const season = await this.getSeasonByKeyOrActive(seasonKey);
    const normalizedTier = toPositiveInt(tierNumber, 'tierNumber', 1, 1000000);
    const progress = await this.ensureProgress(season.id, userId);
    const currentTier = toTierFromXp(progress.xp, season.base_xp_per_tier);

    if (normalizedTier > currentTier) {
      const err = new Error('Tier has not been reached');
      err.code = 'TIER_NOT_REACHED';
      throw err;
    }

    const claimed = await dataAccess.listBattlePassClaims(season.id, userId);
    const retroClaimed = await dataAccess.listBattlePassRetroactiveClaims(season.id, userId);
    const alreadyClaimed = claimed.some((c) => c.tier_number === normalizedTier)
      || retroClaimed.some((c) => c.tier_number === normalizedTier);

    if (alreadyClaimed) {
      const err = new Error('Tier reward already claimed');
      err.code = 'DUPLICATE_CLAIM';
      throw err;
    }

    const tierRewardDb = await dataAccess.getBattlePassTierReward(season.id, normalizedTier);
    const reward = this.normalizeTierReward(season, normalizedTier, tierRewardDb);

    if (!reward) {
      const err = new Error('No reward configured for tier');
      err.code = 'REWARD_NOT_CONFIGURED';
      throw err;
    }

    try {
      await dataAccess.createBattlePassRewardClaim({
        id: makeId('bp_claim'),
        seasonId: season.id,
        userId,
        tierNumber: normalizedTier,
        claimType,
        rewardType: reward.rewardType,
        rewardAmount: reward.rewardAmount,
        idempotencyKey,
        metadata: {
          rewardName: reward.rewardName,
          rewardTier: reward.rewardTier,
          requestId
        }
      });
    } catch (error) {
      if (error && error.code === '23505') {
        const err = new Error('Tier reward already claimed');
        err.code = 'DUPLICATE_CLAIM';
        throw err;
      }
      throw error;
    }

    await this.applyRewardToUser(userId, reward);

    await appendAuditEvent({
      actorUserId: userId,
      targetUserId: userId,
      entityType: 'battle_pass_reward_claim',
      entityId: `${season.id}:${normalizedTier}`,
      eventType: 'battle_pass.reward_claimed',
      requestId,
      idempotencyKey,
      metadata: {
        seasonId: season.id,
        tierNumber: normalizedTier,
        claimType,
        reward
      }
    });

    return {
      seasonId: season.id,
      tierNumber: normalizedTier,
      claimType,
      reward
    };
  }

  async createTeam(userId, { seasonKey = null, name, requestId = null, idempotencyKey = null }) {
    const season = await this.getSeasonByKeyOrActive(seasonKey);

    if (typeof name !== 'string' || name.trim().length < 3 || name.trim().length > 40) {
      const err = new Error('Team name must be 3-40 chars');
      err.code = 'INVALID_TEAM_NAME';
      throw err;
    }

    const existing = await dataAccess.getBattlePassTeamForUser(season.id, userId);
    if (existing) {
      const err = new Error('User already has a team in this season');
      err.code = 'ALREADY_IN_TEAM';
      throw err;
    }

    let team;
    try {
      team = await dataAccess.createBattlePassTeam({
        id: makeId('bp_team'),
        seasonId: season.id,
        name: name.trim(),
        ownerUserId: userId,
        metadata: {}
      });
    } catch (error) {
      if (error && error.code === '23505') {
        const err = new Error('Team name already exists for season');
        err.code = 'TEAM_NAME_TAKEN';
        throw err;
      }
      throw error;
    }

    await dataAccess.addBattlePassTeamMember({
      id: makeId('bp_tm'),
      teamId: team.id,
      userId,
      role: 'owner',
      metadata: {}
    });

    await appendAuditEvent({
      actorUserId: userId,
      targetUserId: userId,
      entityType: 'battle_pass_team',
      entityId: team.id,
      eventType: 'battle_pass.team_created',
      requestId,
      idempotencyKey,
      metadata: { seasonId: season.id, teamName: team.name }
    });

    return {
      seasonId: season.id,
      team
    };
  }

  async joinTeam(userId, { seasonKey = null, teamId, requestId = null, idempotencyKey = null }) {
    const season = await this.getSeasonByKeyOrActive(seasonKey);

    if (typeof teamId !== 'string' || !teamId.trim()) {
      const err = new Error('teamId is required');
      err.code = 'INVALID_TEAM_ID';
      throw err;
    }

    const alreadyInTeam = await dataAccess.getBattlePassTeamForUser(season.id, userId);
    if (alreadyInTeam) {
      const err = new Error('User already has a team in this season');
      err.code = 'ALREADY_IN_TEAM';
      throw err;
    }

    const teamResult = await postgres.query(
      `
        SELECT *
        FROM battle_pass_teams
        WHERE id = $1
          AND season_id = $2
        LIMIT 1
      `,
      [teamId.trim(), season.id]
    );
    const team = teamResult.rows[0];

    if (!team) {
      const err = new Error('Team not found in active season');
      err.code = 'TEAM_NOT_FOUND';
      throw err;
    }

    try {
      await dataAccess.addBattlePassTeamMember({
        id: makeId('bp_tm'),
        teamId: team.id,
        userId,
        role: 'member',
        metadata: {}
      });
    } catch (error) {
      if (error && error.code === '23505') {
        const err = new Error('User already in team');
        err.code = 'ALREADY_IN_TEAM';
        throw err;
      }
      throw error;
    }

    await appendAuditEvent({
      actorUserId: userId,
      targetUserId: userId,
      entityType: 'battle_pass_team',
      entityId: team.id,
      eventType: 'battle_pass.team_joined',
      requestId,
      idempotencyKey,
      metadata: { seasonId: season.id }
    });

    return {
      seasonId: season.id,
      teamId: team.id
    };
  }

  async contributeTeamXp(userId, {
    seasonKey = null,
    xpAmount,
    requestId = null,
    idempotencyKey = null
  }) {
    const season = await this.getSeasonByKeyOrActive(seasonKey);
    const normalizedXpAmount = toPositiveInt(xpAmount, 'xpAmount', 1, 100000);

    const team = await dataAccess.getBattlePassTeamForUser(season.id, userId);
    if (!team) {
      const err = new Error('User is not in a team');
      err.code = 'TEAM_MEMBERSHIP_REQUIRED';
      throw err;
    }

    const dayKey = dayBucket(new Date());
    const daily = await dataAccess.getBattlePassTeamDailyContribution(team.id, userId, dayKey);
    const currentDaily = Number(daily?.contributed_xp || 0);
    const cap = Math.max(0, parseInt(season.team_daily_contribution_cap || 0, 10));
    const remaining = Math.max(0, cap - currentDaily);

    if (remaining <= 0) {
      const err = new Error('Daily team contribution cap reached');
      err.code = 'DAILY_TEAM_CONTRIBUTION_CAP_REACHED';
      throw err;
    }

    const appliedXp = Math.min(remaining, normalizedXpAmount);
    const newDaily = currentDaily + appliedXp;

    await dataAccess.upsertBattlePassTeamDailyContribution({
      id: daily?.id || makeId('bp_tdc'),
      teamId: team.id,
      userId,
      dayKey,
      contributedXp: newDaily,
      metadata: { idempotencyKey }
    });

    await dataAccess.createBattlePassTeamProgressEvent({
      id: makeId('bp_tpe'),
      seasonId: season.id,
      teamId: team.id,
      userId,
      xpAmount: appliedXp,
      dayKey,
      metadata: { requestId, idempotencyKey }
    });

    await dataAccess.updateBattlePassTeamXp(team.id, Number(team.total_xp || 0) + appliedXp);

    await appendAuditEvent({
      actorUserId: userId,
      targetUserId: userId,
      entityType: 'battle_pass_team',
      entityId: team.id,
      eventType: 'battle_pass.team_xp_contributed',
      requestId,
      idempotencyKey,
      metadata: {
        seasonId: season.id,
        dayKey,
        requestedXp: normalizedXpAmount,
        appliedXp,
        dailyTotal: newDaily,
        dailyCap: cap
      }
    });

    return {
      seasonId: season.id,
      teamId: team.id,
      requestedXp: normalizedXpAmount,
      appliedXp,
      dailyTotal: newDaily,
      dailyCap: cap,
      capped: appliedXp < normalizedXpAmount
    };
  }

  async claimRetroactiveRewards(userId, {
    seasonKey = null,
    fromTier = 1,
    toTier = null,
    requestId = null,
    idempotencyKey = null
  }) {
    const season = await this.getSeasonByKeyOrActive(seasonKey);
    const progress = await this.ensureProgress(season.id, userId);
    const currentTier = toTierFromXp(progress.xp, season.base_xp_per_tier);

    const normalizedFromTier = toPositiveInt(fromTier, 'fromTier', 1, currentTier);
    const normalizedToTier = toTier == null
      ? currentTier
      : toPositiveInt(toTier, 'toTier', normalizedFromTier, currentTier);

    const claims = await dataAccess.listBattlePassClaims(season.id, userId);
    const retroClaims = await dataAccess.listBattlePassRetroactiveClaims(season.id, userId);
    const claimedSet = new Set([
      ...claims.map((c) => c.tier_number),
      ...retroClaims.map((c) => c.tier_number)
    ]);

    const awarded = [];

    for (let tier = normalizedFromTier; tier <= normalizedToTier; tier += 1) {
      if (claimedSet.has(tier)) continue;

      const dbReward = await dataAccess.getBattlePassTierReward(season.id, tier);
      const reward = this.normalizeTierReward(season, tier, dbReward);
      if (!reward) continue;

      try {
        await dataAccess.createBattlePassRetroactiveClaim({
          id: makeId('bp_retro'),
          seasonId: season.id,
          userId,
          tierNumber: tier,
          rewardType: reward.rewardType,
          rewardAmount: reward.rewardAmount,
          idempotencyKey,
          metadata: {
            rewardName: reward.rewardName,
            rewardTier: reward.rewardTier,
            requestId
          }
        });

        await dataAccess.createBattlePassRewardClaim({
          id: makeId('bp_claim'),
          seasonId: season.id,
          userId,
          tierNumber: tier,
          claimType: 'retroactive',
          rewardType: reward.rewardType,
          rewardAmount: reward.rewardAmount,
          idempotencyKey,
          metadata: {
            rewardName: reward.rewardName,
            rewardTier: reward.rewardTier,
            requestId
          }
        });
      } catch (error) {
        if (error && error.code === '23505') {
          continue;
        }
        throw error;
      }

      await this.applyRewardToUser(userId, reward);
      awarded.push({ tierNumber: tier, reward });
    }

    await appendAuditEvent({
      actorUserId: userId,
      targetUserId: userId,
      entityType: 'battle_pass_retroactive_claim',
      entityId: season.id,
      eventType: 'battle_pass.retroactive_claimed',
      requestId,
      idempotencyKey,
      metadata: {
        seasonId: season.id,
        fromTier: normalizedFromTier,
        toTier: normalizedToTier,
        claimCount: awarded.length
      }
    });

    return {
      seasonId: season.id,
      fromTier: normalizedFromTier,
      toTier: normalizedToTier,
      claimedCount: awarded.length,
      claimedRewards: awarded
    };
  }
}

module.exports = new BattlePassServiceV2();
