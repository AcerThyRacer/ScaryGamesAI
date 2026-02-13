/**
 * Data Access Abstraction
 * Phase 1.1 foundation for JSON -> PostgreSQL migration.
 */

const jsonDb = require('./database');
const postgres = require('./postgres');

function ensurePostgresEnabled() {
  if (!postgres.isEnabled()) {
    const err = new Error('PostgreSQL is not configured for economy operations');
    err.code = 'PG_DISABLED';
    throw err;
  }
}

function requireNonEmptyString(value, fieldName, maxLength = 200) {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required`);
  }

  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} must be <= ${maxLength} chars`);
  }

  return normalized;
}

function normalizeCurrency(value) {
  if (!value) return 'USD';
  return requireNonEmptyString(value, 'currency', 8).toUpperCase();
}

function toAmount(value, fieldName) {
  const normalized = Number.isFinite(value) ? Math.trunc(value) : 0;
  if (normalized < 0) {
    throw new Error(`${fieldName} must be >= 0`);
  }
  return normalized;
}

function toIsoTimestampOrNull(value, fieldName) {
  if (value == null) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid timestamp`);
  }
  return date.toISOString();
}

function toJson(value, fallback = {}) {
  const safeValue = value == null ? fallback : value;
  return JSON.stringify(safeValue);
}

async function getSubscriptionLeaderboard(limit = 100) {
  if (postgres.isEnabled()) {
    try {
      const sql = `
        SELECT
          COALESCE(u.username, 'Unknown') AS username,
          s.tier,
          COALESCE(s.streak_days, 0) AS "streakDays",
          COALESCE(s.total_days, 0) AS "totalDays"
        FROM subscriptions s
        LEFT JOIN users u ON u.id = s.user_id
        WHERE s.status = 'active'
        ORDER BY s.streak_days DESC
        LIMIT $1
      `;
      const result = await postgres.query(sql, [limit]);
      return result.rows;
    } catch (err) {
      console.warn('[data-access] PostgreSQL leaderboard query failed, falling back to JSON:', err.message);
    }
  }

  return jsonDb.getLeaderboard(limit);
}

async function createIdempotencyKey({
  id,
  scope,
  key,
  requestHash = null,
  status = 'in_progress',
  lockedUntil = null
}) {
  ensurePostgresEnabled();

  const normalizedId = requireNonEmptyString(id, 'id', 120);
  const normalizedScope = requireNonEmptyString(scope, 'scope', 120);
  const normalizedKey = requireNonEmptyString(key, 'key', 255);
  const normalizedStatus = requireNonEmptyString(status, 'status', 64);
  const normalizedHash = requestHash ? requireNonEmptyString(requestHash, 'requestHash', 255) : null;
  const normalizedLockedUntil = toIsoTimestampOrNull(lockedUntil, 'lockedUntil');

  const sql = `
    INSERT INTO idempotency_keys (
      id,
      scope,
      idempotency_key,
      request_hash,
      status,
      locked_until,
      created_at,
      updated_at,
      last_seen_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())
    ON CONFLICT (scope, idempotency_key)
    DO UPDATE SET
      updated_at = NOW(),
      last_seen_at = NOW()
    RETURNING *, (xmax = 0) AS inserted
  `;

  const result = await postgres.query(sql, [
    normalizedId,
    normalizedScope,
    normalizedKey,
    normalizedHash,
    normalizedStatus,
    normalizedLockedUntil
  ]);

  return result.rows[0] || null;
}

async function getIdempotencyKey(scope, key) {
  ensurePostgresEnabled();

  const normalizedScope = requireNonEmptyString(scope, 'scope', 120);
  const normalizedKey = requireNonEmptyString(key, 'key', 255);

  const sql = `
    SELECT *
    FROM idempotency_keys
    WHERE scope = $1
      AND idempotency_key = $2
    LIMIT 1
  `;

  const result = await postgres.query(sql, [normalizedScope, normalizedKey]);
  return result.rows[0] || null;
}

async function updateIdempotencyKeyResult({
  scope,
  key,
  status,
  responseCode = null,
  responseBody = null,
  resourceType = null,
  resourceId = null
}) {
  ensurePostgresEnabled();

  const normalizedScope = requireNonEmptyString(scope, 'scope', 120);
  const normalizedKey = requireNonEmptyString(key, 'key', 255);
  const normalizedStatus = requireNonEmptyString(status, 'status', 64);

  const sql = `
    UPDATE idempotency_keys
    SET
      status = $3,
      response_code = $4,
      response_body = $5::jsonb,
      resource_type = $6,
      resource_id = $7,
      updated_at = NOW(),
      last_seen_at = NOW()
    WHERE scope = $1
      AND idempotency_key = $2
    RETURNING *
  `;

  const result = await postgres.query(sql, [
    normalizedScope,
    normalizedKey,
    normalizedStatus,
    responseCode,
    toJson(responseBody, null),
    resourceType,
    resourceId
  ]);

  return result.rows[0] || null;
}

async function createOrder({
  id,
  userId = null,
  status = 'pending',
  currency = 'USD',
  subtotalAmount = 0,
  taxAmount = 0,
  discountAmount = 0,
  totalAmount = 0,
  metadata = {}
}) {
  ensurePostgresEnabled();

  const normalizedId = requireNonEmptyString(id, 'id', 120);
  const normalizedUserId = userId == null ? null : requireNonEmptyString(userId, 'userId', 120);
  const normalizedStatus = requireNonEmptyString(status, 'status', 64);
  const normalizedCurrency = normalizeCurrency(currency);

  const sql = `
    INSERT INTO orders (
      id,
      user_id,
      status,
      currency,
      subtotal_amount,
      tax_amount,
      discount_amount,
      total_amount,
      metadata,
      placed_at,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW(), NOW(), NOW())
    RETURNING *
  `;

  const result = await postgres.query(sql, [
    normalizedId,
    normalizedUserId,
    normalizedStatus,
    normalizedCurrency,
    toAmount(subtotalAmount, 'subtotalAmount'),
    toAmount(taxAmount, 'taxAmount'),
    toAmount(discountAmount, 'discountAmount'),
    toAmount(totalAmount, 'totalAmount'),
    toJson(metadata)
  ]);

  return result.rows[0] || null;
}

async function updateOrder(orderId, updates = {}) {
  ensurePostgresEnabled();

  const normalizedOrderId = requireNonEmptyString(orderId, 'orderId', 120);
  const setClauses = [];
  const values = [];

  const addClause = (sql, value) => {
    values.push(value);
    setClauses.push(`${sql} = $${values.length}`);
  };

  if (Object.prototype.hasOwnProperty.call(updates, 'status')) {
    addClause('status', requireNonEmptyString(updates.status, 'status', 64));
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'currency')) {
    addClause('currency', normalizeCurrency(updates.currency));
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'subtotalAmount')) {
    addClause('subtotal_amount', toAmount(updates.subtotalAmount, 'subtotalAmount'));
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'taxAmount')) {
    addClause('tax_amount', toAmount(updates.taxAmount, 'taxAmount'));
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'discountAmount')) {
    addClause('discount_amount', toAmount(updates.discountAmount, 'discountAmount'));
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'totalAmount')) {
    addClause('total_amount', toAmount(updates.totalAmount, 'totalAmount'));
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'metadata')) {
    addClause('metadata', toJson(updates.metadata));
    setClauses[setClauses.length - 1] = `metadata = $${values.length}::jsonb`;
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'completedAt')) {
    addClause('completed_at', toIsoTimestampOrNull(updates.completedAt, 'completedAt'));
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'canceledAt')) {
    addClause('canceled_at', toIsoTimestampOrNull(updates.canceledAt, 'canceledAt'));
  }

  if (setClauses.length === 0) {
    return getOrderById(normalizedOrderId);
  }

  values.push(normalizedOrderId);

  const sql = `
    UPDATE orders
    SET ${setClauses.join(', ')}, updated_at = NOW()
    WHERE id = $${values.length}
    RETURNING *
  `;

  const result = await postgres.query(sql, values);
  return result.rows[0] || null;
}

async function getOrderById(orderId) {
  ensurePostgresEnabled();

  const normalizedOrderId = requireNonEmptyString(orderId, 'orderId', 120);

  const sql = `
    SELECT *
    FROM orders
    WHERE id = $1
    LIMIT 1
  `;

  const result = await postgres.query(sql, [normalizedOrderId]);
  return result.rows[0] || null;
}

async function grantEntitlement({
  id,
  userId,
  productId = null,
  skuId = null,
  entitlementType,
  status = 'active',
  quantity = 1,
  grantedByOrderId = null,
  grantedReason = null,
  startsAt = null,
  expiresAt = null,
  metadata = {}
}) {
  ensurePostgresEnabled();

  const normalizedId = requireNonEmptyString(id, 'id', 120);
  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);
  const normalizedProductId = productId == null ? null : requireNonEmptyString(productId, 'productId', 120);
  const normalizedSkuId = skuId == null ? null : requireNonEmptyString(skuId, 'skuId', 120);
  const normalizedType = requireNonEmptyString(entitlementType, 'entitlementType', 120);
  const normalizedStatus = requireNonEmptyString(status, 'status', 64);
  const normalizedQuantity = Number.isFinite(quantity) ? Math.trunc(quantity) : 1;
  if (normalizedQuantity < 0) {
    throw new Error('quantity must be >= 0');
  }

  const sql = `
    INSERT INTO entitlements (
      id,
      user_id,
      product_id,
      sku_id,
      entitlement_type,
      status,
      quantity,
      consumed_quantity,
      granted_by_order_id,
      granted_reason,
      metadata,
      starts_at,
      expires_at,
      created_at,
      updated_at
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      0,
      $8,
      $9,
      $10::jsonb,
      COALESCE($11::timestamptz, NOW()),
      $12::timestamptz,
      NOW(),
      NOW()
    )
    RETURNING *
  `;

  const result = await postgres.query(sql, [
    normalizedId,
    normalizedUserId,
    normalizedProductId,
    normalizedSkuId,
    normalizedType,
    normalizedStatus,
    normalizedQuantity,
    grantedByOrderId,
    grantedReason,
    toJson(metadata),
    toIsoTimestampOrNull(startsAt, 'startsAt'),
    toIsoTimestampOrNull(expiresAt, 'expiresAt')
  ]);

  return result.rows[0] || null;
}

async function getEntitlementById(entitlementId) {
  ensurePostgresEnabled();

  const normalizedEntitlementId = requireNonEmptyString(entitlementId, 'entitlementId', 120);

  const sql = `
    SELECT *
    FROM entitlements
    WHERE id = $1
    LIMIT 1
  `;

  const result = await postgres.query(sql, [normalizedEntitlementId]);
  return result.rows[0] || null;
}

async function listEntitlementsByUser(userId, options = {}) {
  ensurePostgresEnabled();

  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);
  const limit = Math.min(Math.max(parseInt(options.limit || 100, 10), 1), 500);
  const offset = Math.max(parseInt(options.offset || 0, 10), 0);

  const whereParts = ['user_id = $1'];
  const values = [normalizedUserId];

  if (options.status) {
    values.push(requireNonEmptyString(options.status, 'status', 64));
    whereParts.push(`status = $${values.length}`);
  }

  values.push(limit);
  values.push(offset);

  const sql = `
    SELECT *
    FROM entitlements
    WHERE ${whereParts.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT $${values.length - 1}
    OFFSET $${values.length}
  `;

  const result = await postgres.query(sql, values);
  return result.rows;
}

async function appendEconomyAuditLog({
  id,
  actorUserId = null,
  targetUserId = null,
  entityType,
  entityId = null,
  eventType,
  severity = 'info',
  message = null,
  requestId = null,
  idempotencyKey = null,
  metadata = {}
}) {
  ensurePostgresEnabled();

  const normalizedId = requireNonEmptyString(id, 'id', 120);
  const normalizedEntityType = requireNonEmptyString(entityType, 'entityType', 120);
  const normalizedEventType = requireNonEmptyString(eventType, 'eventType', 120);
  const normalizedSeverity = requireNonEmptyString(severity, 'severity', 32);

  const sql = `
    INSERT INTO economy_audit_log (
      id,
      actor_user_id,
      target_user_id,
      entity_type,
      entity_id,
      event_type,
      severity,
      message,
      request_id,
      idempotency_key,
      metadata,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, NOW())
    RETURNING *
  `;

  const result = await postgres.query(sql, [
    normalizedId,
    actorUserId,
    targetUserId,
    normalizedEntityType,
    entityId,
    normalizedEventType,
    normalizedSeverity,
    message,
    requestId,
    idempotencyKey,
    toJson(metadata)
  ]);

  return result.rows[0] || null;
}

async function getActiveBattlePassSeason(nowIso = null) {
  ensurePostgresEnabled();

  const now = toIsoTimestampOrNull(nowIso, 'nowIso') || new Date().toISOString();
  const sql = `
    SELECT *
    FROM battle_pass_seasons
    WHERE is_active = TRUE
      AND starts_at <= $1::timestamptz
      AND ends_at > $1::timestamptz
    ORDER BY starts_at DESC
    LIMIT 1
  `;

  const result = await postgres.query(sql, [now]);
  return result.rows[0] || null;
}

async function ensureBattlePassUserProgress({ id, seasonId, userId }) {
  ensurePostgresEnabled();

  const normalizedId = requireNonEmptyString(id, 'id', 120);
  const normalizedSeasonId = requireNonEmptyString(seasonId, 'seasonId', 120);
  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);

  const sql = `
    INSERT INTO battle_pass_user_progress (
      id,
      season_id,
      user_id,
      xp,
      level,
      enrolled_at,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, 0, 1, NOW(), NOW(), NOW())
    ON CONFLICT (season_id, user_id)
    DO UPDATE SET
      updated_at = battle_pass_user_progress.updated_at
    RETURNING *
  `;

  const result = await postgres.query(sql, [normalizedId, normalizedSeasonId, normalizedUserId]);
  return result.rows[0] || null;
}

async function getBattlePassUserProgress(seasonId, userId) {
  ensurePostgresEnabled();

  const normalizedSeasonId = requireNonEmptyString(seasonId, 'seasonId', 120);
  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);

  const sql = `
    SELECT *
    FROM battle_pass_user_progress
    WHERE season_id = $1
      AND user_id = $2
    LIMIT 1
  `;

  const result = await postgres.query(sql, [normalizedSeasonId, normalizedUserId]);
  return result.rows[0] || null;
}

async function getBattlePassTierReward(seasonId, tierNumber) {
  ensurePostgresEnabled();

  const normalizedSeasonId = requireNonEmptyString(seasonId, 'seasonId', 120);
  const parsedTier = parseInt(tierNumber, 10);
  if (!Number.isFinite(parsedTier) || parsedTier < 1) {
    const err = new Error('tierNumber must be >= 1');
    err.code = 'INVALID_TIER';
    throw err;
  }

  const sql = `
    SELECT *
    FROM battle_pass_tiers
    WHERE season_id = $1
      AND tier_number = $2
    LIMIT 1
  `;

  const result = await postgres.query(sql, [normalizedSeasonId, parsedTier]);
  return result.rows[0] || null;
}

async function listBattlePassClaims(seasonId, userId) {
  ensurePostgresEnabled();

  const normalizedSeasonId = requireNonEmptyString(seasonId, 'seasonId', 120);
  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);

  const sql = `
    SELECT tier_number, claim_type, reward_type, reward_amount, claimed_at
    FROM battle_pass_reward_claims
    WHERE season_id = $1
      AND user_id = $2
    ORDER BY tier_number ASC
  `;

  const result = await postgres.query(sql, [normalizedSeasonId, normalizedUserId]);
  return result.rows;
}

async function listBattlePassQuests(seasonId) {
  ensurePostgresEnabled();

  const normalizedSeasonId = requireNonEmptyString(seasonId, 'seasonId', 120);

  const sql = `
    SELECT *
    FROM battle_pass_quests
    WHERE season_id = $1
    ORDER BY quest_kind ASC, quest_code ASC
  `;

  const result = await postgres.query(sql, [normalizedSeasonId]);
  return result.rows;
}

async function createBattlePassEvent({
  id,
  seasonId,
  userId,
  eventType,
  eventValue = 1,
  source = null,
  metadata = {},
  occurredAt = null
}) {
  ensurePostgresEnabled();

  const normalizedId = requireNonEmptyString(id, 'id', 120);
  const normalizedSeasonId = requireNonEmptyString(seasonId, 'seasonId', 120);
  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);
  const normalizedEventType = requireNonEmptyString(eventType, 'eventType', 120);
  const normalizedValue = Math.max(1, parseInt(eventValue, 10) || 1);

  const sql = `
    INSERT INTO battle_pass_events (
      id,
      season_id,
      user_id,
      event_type,
      event_value,
      source,
      metadata,
      occurred_at,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, COALESCE($8::timestamptz, NOW()), NOW())
    RETURNING *
  `;

  const result = await postgres.query(sql, [
    normalizedId,
    normalizedSeasonId,
    normalizedUserId,
    normalizedEventType,
    normalizedValue,
    source,
    toJson(metadata),
    toIsoTimestampOrNull(occurredAt, 'occurredAt')
  ]);

  return result.rows[0] || null;
}

async function getBattlePassQuestCompletion(seasonId, userId, questId, completionBucket) {
  ensurePostgresEnabled();

  const normalizedSeasonId = requireNonEmptyString(seasonId, 'seasonId', 120);
  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);
  const normalizedQuestId = requireNonEmptyString(questId, 'questId', 120);
  const normalizedBucket = requireNonEmptyString(completionBucket, 'completionBucket', 120);

  const sql = `
    SELECT *
    FROM battle_pass_quest_completions
    WHERE season_id = $1
      AND user_id = $2
      AND quest_id = $3
      AND completion_bucket = $4
    LIMIT 1
  `;

  const result = await postgres.query(sql, [normalizedSeasonId, normalizedUserId, normalizedQuestId, normalizedBucket]);
  return result.rows[0] || null;
}

async function upsertBattlePassQuestCompletion({
  id,
  seasonId,
  userId,
  questId,
  completionBucket,
  progressCount,
  xpAwarded,
  metadata = {},
  completedAt = null
}) {
  ensurePostgresEnabled();

  const normalizedId = requireNonEmptyString(id, 'id', 120);
  const normalizedSeasonId = requireNonEmptyString(seasonId, 'seasonId', 120);
  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);
  const normalizedQuestId = requireNonEmptyString(questId, 'questId', 120);
  const normalizedBucket = requireNonEmptyString(completionBucket, 'completionBucket', 120);
  const normalizedProgress = Math.max(0, parseInt(progressCount, 10) || 0);
  const normalizedXp = Math.max(0, parseInt(xpAwarded, 10) || 0);

  const sql = `
    INSERT INTO battle_pass_quest_completions (
      id,
      season_id,
      user_id,
      quest_id,
      completion_bucket,
      progress_count,
      xp_awarded,
      metadata,
      completed_at,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, COALESCE($9::timestamptz, NOW()), NOW())
    ON CONFLICT (season_id, user_id, quest_id, completion_bucket)
    DO UPDATE SET
      progress_count = EXCLUDED.progress_count,
      xp_awarded = EXCLUDED.xp_awarded,
      metadata = EXCLUDED.metadata,
      completed_at = EXCLUDED.completed_at
    RETURNING *
  `;

  const result = await postgres.query(sql, [
    normalizedId,
    normalizedSeasonId,
    normalizedUserId,
    normalizedQuestId,
    normalizedBucket,
    normalizedProgress,
    normalizedXp,
    toJson(metadata),
    toIsoTimestampOrNull(completedAt, 'completedAt')
  ]);

  return result.rows[0] || null;
}

async function updateBattlePassUserProgress({
  seasonId,
  userId,
  xp,
  level,
  lastEventAt = null,
  metadata = null
}) {
  ensurePostgresEnabled();

  const normalizedSeasonId = requireNonEmptyString(seasonId, 'seasonId', 120);
  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);
  const normalizedXp = Math.max(0, Math.trunc(Number(xp) || 0));
  const normalizedLevel = Math.max(1, Math.trunc(Number(level) || 1));

  const setParts = ['xp = $3', 'level = $4', 'updated_at = NOW()'];
  const values = [normalizedSeasonId, normalizedUserId, normalizedXp, normalizedLevel];

  if (lastEventAt != null) {
    values.push(toIsoTimestampOrNull(lastEventAt, 'lastEventAt'));
    setParts.push(`last_event_at = $${values.length}::timestamptz`);
  }

  if (metadata != null) {
    values.push(toJson(metadata));
    setParts.push(`metadata = $${values.length}::jsonb`);
  }

  const sql = `
    UPDATE battle_pass_user_progress
    SET ${setParts.join(', ')}
    WHERE season_id = $1
      AND user_id = $2
    RETURNING *
  `;

  const result = await postgres.query(sql, values);
  return result.rows[0] || null;
}

async function createBattlePassRewardClaim({
  id,
  seasonId,
  userId,
  tierNumber,
  claimType = 'tier',
  rewardType,
  rewardAmount = 0,
  idempotencyKey = null,
  metadata = {}
}) {
  ensurePostgresEnabled();

  const normalizedId = requireNonEmptyString(id, 'id', 120);
  const normalizedSeasonId = requireNonEmptyString(seasonId, 'seasonId', 120);
  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);
  const normalizedTierNumber = Math.max(1, parseInt(tierNumber, 10) || 1);
  const normalizedClaimType = requireNonEmptyString(claimType, 'claimType', 32);
  const normalizedRewardType = requireNonEmptyString(rewardType, 'rewardType', 120);
  const normalizedRewardAmount = Math.max(0, parseInt(rewardAmount, 10) || 0);

  const sql = `
    INSERT INTO battle_pass_reward_claims (
      id,
      season_id,
      user_id,
      tier_number,
      claim_type,
      reward_type,
      reward_amount,
      idempotency_key,
      metadata,
      claimed_at,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW(), NOW())
    RETURNING *
  `;

  const result = await postgres.query(sql, [
    normalizedId,
    normalizedSeasonId,
    normalizedUserId,
    normalizedTierNumber,
    normalizedClaimType,
    normalizedRewardType,
    normalizedRewardAmount,
    idempotencyKey,
    toJson(metadata)
  ]);

  return result.rows[0] || null;
}

async function listBattlePassTierRewardsUpToTier(seasonId, maxTier) {
  ensurePostgresEnabled();

  const normalizedSeasonId = requireNonEmptyString(seasonId, 'seasonId', 120);
  const normalizedMaxTier = Math.max(1, parseInt(maxTier, 10) || 1);

  const sql = `
    SELECT *
    FROM battle_pass_tiers
    WHERE season_id = $1
      AND tier_number <= $2
    ORDER BY tier_number ASC
  `;

  const result = await postgres.query(sql, [normalizedSeasonId, normalizedMaxTier]);
  return result.rows;
}

async function createBattlePassTeam({ id, seasonId, name, ownerUserId, metadata = {} }) {
  ensurePostgresEnabled();

  const normalizedId = requireNonEmptyString(id, 'id', 120);
  const normalizedSeasonId = requireNonEmptyString(seasonId, 'seasonId', 120);
  const normalizedName = requireNonEmptyString(name, 'name', 120);
  const normalizedOwnerUserId = requireNonEmptyString(ownerUserId, 'ownerUserId', 120);

  const sql = `
    INSERT INTO battle_pass_teams (
      id,
      season_id,
      name,
      owner_user_id,
      total_xp,
      metadata,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, 0, $5::jsonb, NOW(), NOW())
    RETURNING *
  `;

  const result = await postgres.query(sql, [normalizedId, normalizedSeasonId, normalizedName, normalizedOwnerUserId, toJson(metadata)]);
  return result.rows[0] || null;
}

async function addBattlePassTeamMember({ id, teamId, userId, role = 'member', metadata = {} }) {
  ensurePostgresEnabled();

  const normalizedId = requireNonEmptyString(id, 'id', 120);
  const normalizedTeamId = requireNonEmptyString(teamId, 'teamId', 120);
  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);
  const normalizedRole = requireNonEmptyString(role, 'role', 32);

  const sql = `
    INSERT INTO battle_pass_team_members (
      id,
      team_id,
      user_id,
      role,
      joined_at,
      metadata,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4, NOW(), $5::jsonb, NOW(), NOW())
    RETURNING *
  `;

  const result = await postgres.query(sql, [normalizedId, normalizedTeamId, normalizedUserId, normalizedRole, toJson(metadata)]);
  return result.rows[0] || null;
}

async function getBattlePassTeamForUser(seasonId, userId) {
  ensurePostgresEnabled();

  const normalizedSeasonId = requireNonEmptyString(seasonId, 'seasonId', 120);
  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);

  const sql = `
    SELECT t.*
    FROM battle_pass_teams t
    INNER JOIN battle_pass_team_members m ON m.team_id = t.id
    WHERE t.season_id = $1
      AND m.user_id = $2
    LIMIT 1
  `;

  const result = await postgres.query(sql, [normalizedSeasonId, normalizedUserId]);
  return result.rows[0] || null;
}

async function listBattlePassTeamMembers(teamId) {
  ensurePostgresEnabled();

  const normalizedTeamId = requireNonEmptyString(teamId, 'teamId', 120);
  const sql = `
    SELECT *
    FROM battle_pass_team_members
    WHERE team_id = $1
    ORDER BY created_at ASC
  `;

  const result = await postgres.query(sql, [normalizedTeamId]);
  return result.rows;
}

async function getBattlePassTeamDailyContribution(teamId, userId, dayKey) {
  ensurePostgresEnabled();

  const normalizedTeamId = requireNonEmptyString(teamId, 'teamId', 120);
  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);
  const normalizedDayKey = requireNonEmptyString(dayKey, 'dayKey', 20);

  const sql = `
    SELECT *
    FROM battle_pass_team_daily_contributions
    WHERE team_id = $1
      AND user_id = $2
      AND day_key = $3::date
    LIMIT 1
  `;

  const result = await postgres.query(sql, [normalizedTeamId, normalizedUserId, normalizedDayKey]);
  return result.rows[0] || null;
}

async function upsertBattlePassTeamDailyContribution({ id, teamId, userId, dayKey, contributedXp, metadata = {} }) {
  ensurePostgresEnabled();

  const normalizedId = requireNonEmptyString(id, 'id', 120);
  const normalizedTeamId = requireNonEmptyString(teamId, 'teamId', 120);
  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);
  const normalizedDayKey = requireNonEmptyString(dayKey, 'dayKey', 20);
  const normalizedXp = Math.max(0, parseInt(contributedXp, 10) || 0);

  const sql = `
    INSERT INTO battle_pass_team_daily_contributions (
      id,
      team_id,
      user_id,
      day_key,
      contributed_xp,
      metadata,
      created_at,
      updated_at
    )
    VALUES ($1, $2, $3, $4::date, $5, $6::jsonb, NOW(), NOW())
    ON CONFLICT (team_id, user_id, day_key)
    DO UPDATE SET
      contributed_xp = EXCLUDED.contributed_xp,
      metadata = EXCLUDED.metadata,
      updated_at = NOW()
    RETURNING *
  `;

  const result = await postgres.query(sql, [normalizedId, normalizedTeamId, normalizedUserId, normalizedDayKey, normalizedXp, toJson(metadata)]);
  return result.rows[0] || null;
}

async function updateBattlePassTeamXp(teamId, totalXp) {
  ensurePostgresEnabled();

  const normalizedTeamId = requireNonEmptyString(teamId, 'teamId', 120);
  const normalizedXp = Math.max(0, Math.trunc(Number(totalXp) || 0));

  const sql = `
    UPDATE battle_pass_teams
    SET total_xp = $2,
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;

  const result = await postgres.query(sql, [normalizedTeamId, normalizedXp]);
  return result.rows[0] || null;
}

async function createBattlePassTeamProgressEvent({ id, seasonId, teamId, userId, xpAmount, dayKey, metadata = {} }) {
  ensurePostgresEnabled();

  const normalizedId = requireNonEmptyString(id, 'id', 120);
  const normalizedSeasonId = requireNonEmptyString(seasonId, 'seasonId', 120);
  const normalizedTeamId = requireNonEmptyString(teamId, 'teamId', 120);
  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);
  const normalizedXpAmount = Math.max(1, parseInt(xpAmount, 10) || 1);
  const normalizedDayKey = requireNonEmptyString(dayKey, 'dayKey', 20);

  const sql = `
    INSERT INTO battle_pass_team_progress_events (
      id,
      season_id,
      team_id,
      user_id,
      xp_amount,
      day_key,
      metadata,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6::date, $7::jsonb, NOW())
    RETURNING *
  `;

  const result = await postgres.query(sql, [
    normalizedId,
    normalizedSeasonId,
    normalizedTeamId,
    normalizedUserId,
    normalizedXpAmount,
    normalizedDayKey,
    toJson(metadata)
  ]);

  return result.rows[0] || null;
}

async function createBattlePassRetroactiveClaim({
  id,
  seasonId,
  userId,
  tierNumber,
  rewardType,
  rewardAmount = 0,
  idempotencyKey = null,
  metadata = {}
}) {
  ensurePostgresEnabled();

  const normalizedId = requireNonEmptyString(id, 'id', 120);
  const normalizedSeasonId = requireNonEmptyString(seasonId, 'seasonId', 120);
  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);
  const normalizedTierNumber = Math.max(1, parseInt(tierNumber, 10) || 1);
  const normalizedRewardType = requireNonEmptyString(rewardType, 'rewardType', 120);
  const normalizedRewardAmount = Math.max(0, parseInt(rewardAmount, 10) || 0);

  const sql = `
    INSERT INTO battle_pass_retroactive_claims (
      id,
      season_id,
      user_id,
      tier_number,
      reward_type,
      reward_amount,
      idempotency_key,
      metadata,
      claimed_at,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW(), NOW())
    RETURNING *
  `;

  const result = await postgres.query(sql, [
    normalizedId,
    normalizedSeasonId,
    normalizedUserId,
    normalizedTierNumber,
    normalizedRewardType,
    normalizedRewardAmount,
    idempotencyKey,
    toJson(metadata)
  ]);

  return result.rows[0] || null;
}

async function listBattlePassRetroactiveClaims(seasonId, userId) {
  ensurePostgresEnabled();

  const normalizedSeasonId = requireNonEmptyString(seasonId, 'seasonId', 120);
  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);

  const sql = `
    SELECT *
    FROM battle_pass_retroactive_claims
    WHERE season_id = $1
      AND user_id = $2
    ORDER BY tier_number ASC
  `;

  const result = await postgres.query(sql, [normalizedSeasonId, normalizedUserId]);
  return result.rows;
}

async function getProductByKey(productKey) {
  ensurePostgresEnabled();

  const normalizedProductKey = requireNonEmptyString(productKey, 'productKey', 120);
  const result = await postgres.query(
    `
      SELECT *
      FROM products
      WHERE product_key = $1
      LIMIT 1
    `,
    [normalizedProductKey]
  );
  return result.rows[0] || null;
}

async function getSkuByKey(skuKey) {
  ensurePostgresEnabled();

  const normalizedSkuKey = requireNonEmptyString(skuKey, 'skuKey', 120);
  const result = await postgres.query(
    `
      SELECT s.*, p.product_key, p.product_type, p.name AS product_name
      FROM skus s
      INNER JOIN products p ON p.id = s.product_id
      WHERE s.sku_key = $1
        AND s.is_active = TRUE
        AND p.is_active = TRUE
      LIMIT 1
    `,
    [normalizedSkuKey]
  );
  return result.rows[0] || null;
}

async function createOrderItem({
  id,
  orderId,
  skuId = null,
  productId = null,
  quantity = 1,
  unitAmount = 0,
  totalAmount = 0,
  metadata = {}
}) {
  ensurePostgresEnabled();

  const normalizedId = requireNonEmptyString(id, 'id', 120);
  const normalizedOrderId = requireNonEmptyString(orderId, 'orderId', 120);
  const normalizedSkuId = skuId == null ? null : requireNonEmptyString(skuId, 'skuId', 120);
  const normalizedProductId = productId == null ? null : requireNonEmptyString(productId, 'productId', 120);
  const normalizedQuantity = Math.max(1, parseInt(quantity, 10) || 1);

  const result = await postgres.query(
    `
      INSERT INTO order_items (
        id,
        order_id,
        sku_id,
        product_id,
        quantity,
        unit_amount,
        total_amount,
        metadata,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW(), NOW())
      RETURNING *
    `,
    [
      normalizedId,
      normalizedOrderId,
      normalizedSkuId,
      normalizedProductId,
      normalizedQuantity,
      toAmount(unitAmount, 'unitAmount'),
      toAmount(totalAmount, 'totalAmount'),
      toJson(metadata)
    ]
  );

  return result.rows[0] || null;
}

async function createPaymentTransaction({
  id,
  orderId = null,
  provider,
  providerTransactionId = null,
  status = 'pending',
  amount = 0,
  currency = 'USD',
  requestPayload = null,
  responsePayload = null,
  processedAt = null
}) {
  ensurePostgresEnabled();

  const normalizedId = requireNonEmptyString(id, 'id', 120);
  const normalizedOrderId = orderId == null ? null : requireNonEmptyString(orderId, 'orderId', 120);
  const normalizedProvider = requireNonEmptyString(provider, 'provider', 64);
  const normalizedStatus = requireNonEmptyString(status, 'status', 64);

  const result = await postgres.query(
    `
      INSERT INTO payment_transactions (
        id,
        order_id,
        provider,
        provider_transaction_id,
        status,
        amount,
        currency,
        request_payload,
        response_payload,
        processed_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::timestamptz, NOW(), NOW())
      RETURNING *
    `,
    [
      normalizedId,
      normalizedOrderId,
      normalizedProvider,
      providerTransactionId,
      normalizedStatus,
      toAmount(amount, 'amount'),
      normalizeCurrency(currency),
      toJson(requestPayload, null),
      toJson(responsePayload, null),
      toIsoTimestampOrNull(processedAt, 'processedAt')
    ]
  );

  return result.rows[0] || null;
}

async function getActiveEntitlementByType(userId, entitlementType) {
  ensurePostgresEnabled();

  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);
  const normalizedType = requireNonEmptyString(entitlementType, 'entitlementType', 120);

  const result = await postgres.query(
    `
      SELECT *
      FROM entitlements
      WHERE user_id = $1
        AND entitlement_type = $2
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at ASC
      LIMIT 1
    `,
    [normalizedUserId, normalizedType]
  );

  return result.rows[0] || null;
}

async function consumeTournamentTicket({
  id,
  userId,
  tournamentId,
  idempotencyKey = null,
  metadata = {}
}) {
  ensurePostgresEnabled();

  const normalizedId = requireNonEmptyString(id, 'id', 120);
  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);
  const normalizedTournamentId = requireNonEmptyString(tournamentId, 'tournamentId', 120);

  const result = await postgres.query(
    `
      WITH existing AS (
        SELECT 1
        FROM tournament_ticket_consumptions
        WHERE user_id = $1
          AND tournament_id = $2
      ),
      eligible AS (
        SELECT e.id
        FROM entitlements e
        WHERE e.user_id = $1
          AND e.entitlement_type = 'tournament_ticket'
          AND e.status = 'active'
          AND (e.expires_at IS NULL OR e.expires_at > NOW())
          AND e.consumed_quantity < e.quantity
        ORDER BY e.created_at ASC
        LIMIT 1
      ),
      inserted AS (
        INSERT INTO tournament_ticket_consumptions (
          id,
          user_id,
          entitlement_id,
          tournament_id,
          idempotency_key,
          metadata,
          consumed_at,
          created_at
        )
        SELECT $3, $1, eligible.id, $2, $4, $5::jsonb, NOW(), NOW()
        FROM eligible
        WHERE NOT EXISTS (SELECT 1 FROM existing)
        RETURNING entitlement_id
      ),
      updated AS (
        UPDATE entitlements e
        SET consumed_quantity = e.consumed_quantity + 1,
            updated_at = NOW()
        FROM inserted i
        WHERE e.id = i.entitlement_id
        RETURNING e.id, e.quantity, e.consumed_quantity
      )
      SELECT
        (SELECT COUNT(*)::int FROM existing) AS already_used,
        (SELECT COUNT(*)::int FROM eligible) AS has_ticket,
        (SELECT id FROM updated LIMIT 1) AS entitlement_id,
        (SELECT quantity FROM updated LIMIT 1) AS quantity,
        (SELECT consumed_quantity FROM updated LIMIT 1) AS consumed_quantity
    `,
    [
      normalizedUserId,
      normalizedTournamentId,
      normalizedId,
      idempotencyKey,
      toJson(metadata)
    ]
  );

  return result.rows[0] || null;
}

async function createEntitlementConsumption({
  id,
  entitlementId,
  userId,
  quantity = 1,
  idempotencyKey = null,
  metadata = {}
}) {
  ensurePostgresEnabled();

  const normalizedId = requireNonEmptyString(id, 'id', 120);
  const normalizedEntitlementId = requireNonEmptyString(entitlementId, 'entitlementId', 120);
  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);
  const normalizedQuantity = Math.max(1, parseInt(quantity, 10) || 1);

  const result = await postgres.query(
    `
      INSERT INTO entitlement_consumptions (
        id,
        entitlement_id,
        user_id,
        quantity,
        idempotency_key,
        metadata,
        consumed_at,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW())
      RETURNING *
    `,
    [
      normalizedId,
      normalizedEntitlementId,
      normalizedUserId,
      normalizedQuantity,
      idempotencyKey,
      toJson(metadata)
    ]
  );

  return result.rows[0] || null;
}

async function consumeEntitlementQuantity({ entitlementId, quantity = 1 }) {
  ensurePostgresEnabled();

  const normalizedEntitlementId = requireNonEmptyString(entitlementId, 'entitlementId', 120);
  const normalizedQuantity = Math.max(1, parseInt(quantity, 10) || 1);

  const result = await postgres.query(
    `
      UPDATE entitlements
      SET consumed_quantity = consumed_quantity + $2,
          updated_at = NOW()
      WHERE id = $1
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > NOW())
        AND (quantity - consumed_quantity) >= $2
      RETURNING *
    `,
    [normalizedEntitlementId, normalizedQuantity]
  );

  return result.rows[0] || null;
}

async function listUserXpBoosterActivations(userId) {
  ensurePostgresEnabled();

  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);
  const result = await postgres.query(
    `
      SELECT *
      FROM user_xp_booster_activations
      WHERE user_id = $1
      ORDER BY starts_at DESC
      LIMIT 100
    `,
    [normalizedUserId]
  );

  return result.rows;
}

async function listActiveXpBoosterActivations(userId, nowIso = null) {
  ensurePostgresEnabled();

  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);
  const now = toIsoTimestampOrNull(nowIso, 'nowIso') || new Date().toISOString();

  const result = await postgres.query(
    `
      SELECT *
      FROM user_xp_booster_activations
      WHERE user_id = $1
        AND status = 'active'
        AND starts_at <= $2::timestamptz
        AND ends_at > $2::timestamptz
      ORDER BY starts_at ASC
    `,
    [normalizedUserId, now]
  );

  return result.rows;
}

async function createXpBoosterActivation({
  id,
  userId,
  entitlementId,
  multiplier,
  startsAt,
  endsAt,
  idempotencyKey = null,
  metadata = {}
}) {
  ensurePostgresEnabled();

  const normalizedId = requireNonEmptyString(id, 'id', 120);
  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);
  const normalizedEntitlementId = requireNonEmptyString(entitlementId, 'entitlementId', 120);
  const parsedMultiplier = Number(multiplier);
  if (!Number.isFinite(parsedMultiplier) || parsedMultiplier < 1 || parsedMultiplier > 5) {
    const err = new Error('multiplier must be between 1 and 5');
    err.code = 'INVALID_MULTIPLIER';
    throw err;
  }

  const result = await postgres.query(
    `
      INSERT INTO user_xp_booster_activations (
        id,
        user_id,
        entitlement_id,
        multiplier,
        starts_at,
        ends_at,
        idempotency_key,
        status,
        metadata,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, $7, 'active', $8::jsonb, NOW(), NOW())
      RETURNING *
    `,
    [
      normalizedId,
      normalizedUserId,
      normalizedEntitlementId,
      parsedMultiplier,
      toIsoTimestampOrNull(startsAt, 'startsAt'),
      toIsoTimestampOrNull(endsAt, 'endsAt'),
      idempotencyKey,
      toJson(metadata)
    ]
  );

  return result.rows[0] || null;
}

async function getEffectiveXpBoosterMultiplier(userId, nowIso = null) {
  const active = await listActiveXpBoosterActivations(userId, nowIso);
  const total = active.reduce((sum, row) => sum + Number(row.multiplier || 1), 0);
  if (total <= 0) return 1;
  return Number(total.toFixed(3));
}

async function createCharacterUnlock({
  id,
  userId,
  characterKey,
  sourceEntitlementId = null,
  sourcePackKey = null,
  metadata = {}
}) {
  ensurePostgresEnabled();

  const result = await postgres.query(
    `
      INSERT INTO character_unlocks (
        id,
        user_id,
        character_key,
        source_entitlement_id,
        source_pack_key,
        metadata,
        unlocked_at,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW())
      ON CONFLICT (user_id, character_key)
      DO NOTHING
      RETURNING *
    `,
    [
      requireNonEmptyString(id, 'id', 120),
      requireNonEmptyString(userId, 'userId', 120),
      requireNonEmptyString(characterKey, 'characterKey', 120),
      sourceEntitlementId,
      sourcePackKey,
      toJson(metadata)
    ]
  );

  return result.rows[0] || null;
}

async function listCharacterUnlocks(userId) {
  ensurePostgresEnabled();

  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);
  const result = await postgres.query(
    `
      SELECT *
      FROM character_unlocks
      WHERE user_id = $1
      ORDER BY unlocked_at DESC
    `,
    [normalizedUserId]
  );

  return result.rows;
}

async function getSeasonPassCoverage(userId, coverageYear) {
  ensurePostgresEnabled();

  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);
  const normalizedYear = Math.trunc(Number(coverageYear));
  const result = await postgres.query(
    `
      SELECT *
      FROM season_pass_coverage
      WHERE user_id = $1
        AND coverage_year = $2
        AND status = 'active'
      LIMIT 1
    `,
    [normalizedUserId, normalizedYear]
  );

  return result.rows[0] || null;
}

async function upsertSeasonPassCoverage({
  id,
  userId,
  coverageYear,
  entitlementId,
  status = 'active',
  metadata = {}
}) {
  ensurePostgresEnabled();

  const normalizedYear = Math.trunc(Number(coverageYear));
  const result = await postgres.query(
    `
      INSERT INTO season_pass_coverage (
        id,
        user_id,
        coverage_year,
        entitlement_id,
        status,
        metadata,
        starts_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW(), NOW())
      ON CONFLICT (user_id, coverage_year)
      DO UPDATE SET
        entitlement_id = EXCLUDED.entitlement_id,
        status = EXCLUDED.status,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING *
    `,
    [
      requireNonEmptyString(id, 'id', 120),
      requireNonEmptyString(userId, 'userId', 120),
      normalizedYear,
      requireNonEmptyString(entitlementId, 'entitlementId', 120),
      requireNonEmptyString(status, 'status', 32),
      toJson(metadata)
    ]
  );

  return result.rows[0] || null;
}

async function getFounderOwnership(userId) {
  ensurePostgresEnabled();

  const normalizedUserId = requireNonEmptyString(userId, 'userId', 120);
  const result = await postgres.query(
    `
      SELECT *
      FROM founder_edition_ownership
      WHERE user_id = $1
      LIMIT 1
    `,
    [normalizedUserId]
  );

  return result.rows[0] || null;
}

async function createFounderOwnership({
  id,
  userId,
  entitlementId,
  transferable = false,
  transferEligibilityStatus = 'not_eligible',
  metadata = {}
}) {
  ensurePostgresEnabled();

  const result = await postgres.query(
    `
      INSERT INTO founder_edition_ownership (
        id,
        user_id,
        entitlement_id,
        purchased_at,
        transferable,
        transfer_eligibility_status,
        metadata,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, NOW(), $4, $5, $6::jsonb, NOW(), NOW())
      RETURNING *
    `,
    [
      requireNonEmptyString(id, 'id', 120),
      requireNonEmptyString(userId, 'userId', 120),
      requireNonEmptyString(entitlementId, 'entitlementId', 120),
      !!transferable,
      requireNonEmptyString(transferEligibilityStatus, 'transferEligibilityStatus', 64),
      toJson(metadata)
    ]
  );

  return result.rows[0] || null;
}

async function createFounderTransferEvent({
  id,
  founderOwnershipId,
  fromUserId,
  toUserId = null,
  transferStatus,
  reason = null,
  metadata = {}
}) {
  ensurePostgresEnabled();

  const result = await postgres.query(
    `
      INSERT INTO founder_edition_transfer_events (
        id,
        founder_ownership_id,
        from_user_id,
        to_user_id,
        transfer_status,
        reason,
        metadata,
        requested_at,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW(), NOW())
      RETURNING *
    `,
    [
      requireNonEmptyString(id, 'id', 120),
      requireNonEmptyString(founderOwnershipId, 'founderOwnershipId', 120),
      requireNonEmptyString(fromUserId, 'fromUserId', 120),
      toUserId,
      requireNonEmptyString(transferStatus, 'transferStatus', 64),
      reason,
      toJson(metadata)
    ]
  );

  return result.rows[0] || null;
}

async function health() {
  const pg = await postgres.healthCheck();
  return {
    provider: pg.ok ? 'postgres' : 'json',
    postgres: pg
  };
}

module.exports = {
  getSubscriptionLeaderboard,
  createIdempotencyKey,
  getIdempotencyKey,
  updateIdempotencyKeyResult,
  createOrder,
  updateOrder,
  getOrderById,
  getProductByKey,
  getSkuByKey,
  createOrderItem,
  createPaymentTransaction,
  grantEntitlement,
  listEntitlementsByUser,
  getEntitlementById,
  getActiveEntitlementByType,
  consumeTournamentTicket,
  createEntitlementConsumption,
  consumeEntitlementQuantity,
  listUserXpBoosterActivations,
  listActiveXpBoosterActivations,
  createXpBoosterActivation,
  getEffectiveXpBoosterMultiplier,
  createCharacterUnlock,
  listCharacterUnlocks,
  getSeasonPassCoverage,
  upsertSeasonPassCoverage,
  getFounderOwnership,
  createFounderOwnership,
  createFounderTransferEvent,
  appendEconomyAuditLog,
  getActiveBattlePassSeason,
  ensureBattlePassUserProgress,
  getBattlePassUserProgress,
  getBattlePassTierReward,
  listBattlePassClaims,
  listBattlePassQuests,
  createBattlePassEvent,
  getBattlePassQuestCompletion,
  upsertBattlePassQuestCompletion,
  updateBattlePassUserProgress,
  createBattlePassRewardClaim,
  listBattlePassTierRewardsUpToTier,
  createBattlePassTeam,
  addBattlePassTeamMember,
  getBattlePassTeamForUser,
  listBattlePassTeamMembers,
  getBattlePassTeamDailyContribution,
  upsertBattlePassTeamDailyContribution,
  updateBattlePassTeamXp,
  createBattlePassTeamProgressEvent,
  createBattlePassRetroactiveClaim,
  listBattlePassRetroactiveClaims,
  health
};
