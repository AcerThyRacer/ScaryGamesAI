/**
 * Feature flag service with deterministic rollout and optional PostgreSQL persistence.
 */

const crypto = require('crypto');
const postgres = require('../models/postgres');
const cacheService = require('./cacheService');

const CACHE_PREFIX = 'ff:';

function stableHashToBucket(seed) {
  const digest = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 8);
  const n = parseInt(digest, 16);
  return (n % 100) + 1;
}

async function getFlag(key) {
  const cacheKey = `${CACHE_PREFIX}${key}`;
  const cached = await cacheService.getJson(cacheKey);
  if (cached) return cached;

  if (!postgres.isEnabled()) {
    const envEnabled = String(process.env[`FF_${String(key).toUpperCase()}`] || 'false') === 'true';
    return { key, enabled: envEnabled, rolloutPercentage: envEnabled ? 100 : 0, rules: {} };
  }

  const result = await postgres.query(
    'SELECT key, enabled, rollout_percentage, rules FROM feature_flags WHERE key = $1 LIMIT 1',
    [key]
  );
  const row = result.rows[0];
  if (!row) return { key, enabled: false, rolloutPercentage: 0, rules: {} };

  const flag = {
    key: row.key,
    enabled: !!row.enabled,
    rolloutPercentage: row.rollout_percentage || 0,
    rules: row.rules || {}
  };

  await cacheService.setJson(cacheKey, flag, 30);
  return flag;
}

function matchesTargetRules(flag, context) {
  const rules = flag.rules || {};

  if (Array.isArray(rules.userIds) && rules.userIds.length > 0) {
    if (!context.userId || !rules.userIds.includes(String(context.userId))) return false;
  }

  if (Array.isArray(rules.regions) && rules.regions.length > 0) {
    if (!context.region || !rules.regions.includes(String(context.region))) return false;
  }

  if (Array.isArray(rules.environments) && rules.environments.length > 0) {
    if (!context.environment || !rules.environments.includes(String(context.environment))) return false;
  }

  return true;
}

async function isEnabled(key, context = {}) {
  const flag = await getFlag(key);
  if (!flag.enabled) return false;
  if (!matchesTargetRules(flag, context)) return false;

  const basis = String(context.userId || context.sessionId || context.ip || 'anonymous');
  const bucket = stableHashToBucket(`${key}:${basis}`);
  return bucket <= Math.max(0, Math.min(100, Number(flag.rolloutPercentage || 0)));
}

async function setFlag({ key, enabled = false, rolloutPercentage = 0, rules = {}, description = null, createdBy = null }) {
  if (!postgres.isEnabled()) {
    throw new Error('Feature flag writes require PostgreSQL');
  }

  await postgres.query(
    `INSERT INTO feature_flags (key, description, enabled, rollout_percentage, rules, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW(), NOW())
     ON CONFLICT (key)
     DO UPDATE SET
       description = EXCLUDED.description,
       enabled = EXCLUDED.enabled,
       rollout_percentage = EXCLUDED.rollout_percentage,
       rules = EXCLUDED.rules,
       updated_at = NOW()`,
    [key, description, !!enabled, rolloutPercentage, JSON.stringify(rules || {}), createdBy]
  );

  await cacheService.del(`${CACHE_PREFIX}${key}`);
}

module.exports = {
  getFlag,
  isEnabled,
  setFlag
};
