/**
 * Feature flag API (Phase 6)
 * - server-evaluated flag checks
 * - admin flag management + kill switch
 * - audit log records
 */

const express = require('express');
const crypto = require('crypto');
const authMiddleware = require('../middleware/auth');
const featureFlagService = require('../services/featureFlagService');
const postgres = require('../models/postgres');

const router = express.Router();

function parseAdminUserIds() {
  return String(process.env.FEATURE_FLAG_ADMIN_USER_IDS || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function isFeatureFlagAdmin(userId) {
  if (!userId) return false;
  const admins = parseAdminUserIds();
  return admins.includes(String(userId));
}

function fail(res, status, code, message) {
  return res.status(status).json({
    success: false,
    error: { code, message }
  });
}

async function appendAudit({ action, actorUserId = null, flagKey = null, previous = null, next = null, metadata = {} }) {
  if (!postgres.isEnabled()) return;

  await postgres.query(
    `INSERT INTO feature_flag_audit_logs (id, flag_key, actor_user_id, action, previous_state, next_state, metadata, occurred_at, created_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, NOW(), NOW())`,
    [
      `ffal_${crypto.randomBytes(10).toString('hex')}`,
      flagKey,
      actorUserId,
      action,
      JSON.stringify(previous || {}),
      JSON.stringify(next || {}),
      JSON.stringify(metadata || {})
    ]
  ).catch(() => {});
}

function requireAdmin(req, res, next) {
  const userId = req.user?.id;
  if (!isFeatureFlagAdmin(userId)) {
    return fail(res, 403, 'FEATURE_FLAG_ADMIN_REQUIRED', 'Feature flag admin privileges required');
  }
  return next();
}

router.get('/evaluate/:key', async (req, res) => {
  try {
    const key = String(req.params.key || '').trim();
    if (!key) return fail(res, 400, 'FEATURE_FLAG_KEY_REQUIRED', 'Flag key is required');

    const context = {
      userId: req.query.userId ? String(req.query.userId) : undefined,
      sessionId: req.query.sessionId ? String(req.query.sessionId) : undefined,
      ip: req.ip,
      environment: process.env.NODE_ENV || 'development',
      region: req.header('x-region') || undefined
    };

    const [enabled, flag] = await Promise.all([
      featureFlagService.isEnabled(key, context),
      featureFlagService.getFlag(key)
    ]);

    return res.json({
      success: true,
      key,
      enabled,
      rolloutPercentage: flag.rolloutPercentage,
      rules: flag.rules || {}
    });
  } catch (error) {
    return fail(res, 500, 'FEATURE_FLAG_EVAL_FAILED', error.message);
  }
});

router.get('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    if (!postgres.isEnabled()) {
      return res.json({ success: true, flags: [], source: 'env' });
    }

    const result = await postgres.query(
      `SELECT key, description, enabled, rollout_percentage, rules, updated_at
       FROM feature_flags
       ORDER BY key ASC`
    );

    const flags = result.rows.map((row) => ({
      key: row.key,
      description: row.description || null,
      enabled: !!row.enabled,
      rolloutPercentage: Number(row.rollout_percentage || 0),
      rules: row.rules || {},
      updatedAt: row.updated_at
    }));

    return res.json({ success: true, flags, source: 'postgres' });
  } catch (error) {
    return fail(res, 500, 'FEATURE_FLAG_LIST_FAILED', error.message);
  }
});

router.put('/:key', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const key = String(req.params.key || '').trim();
    if (!key) return fail(res, 400, 'FEATURE_FLAG_KEY_REQUIRED', 'Flag key is required');

    const enabled = !!req.body?.enabled;
    const rolloutPercentage = Number(req.body?.rolloutPercentage || 0);
    const rules = req.body?.rules && typeof req.body.rules === 'object' ? req.body.rules : {};
    const description = req.body?.description == null ? null : String(req.body.description);

    if (!Number.isFinite(rolloutPercentage) || rolloutPercentage < 0 || rolloutPercentage > 100) {
      return fail(res, 400, 'FEATURE_FLAG_ROLLOUT_INVALID', 'rolloutPercentage must be between 0 and 100');
    }

    const previous = await featureFlagService.getFlag(key);

    await featureFlagService.setFlag({
      key,
      enabled,
      rolloutPercentage,
      rules: sanitizedRules,
      description,
      createdBy: req.user.id
    });

    const nextFlag = await featureFlagService.getFlag(key);

    await appendAudit({
      action: 'feature_flag.upsert',
      actorUserId: req.user.id,
      flagKey: key,
      previous,
      next: nextFlag,
      metadata: {
        requestId: req.header('x-request-id') || null
      }
    });

    return res.json({ success: true, flag: nextFlag });
  } catch (error) {
    return fail(res, 500, 'FEATURE_FLAG_WRITE_FAILED', error.message);
  }
});

router.post('/:key/kill-switch', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const key = String(req.params.key || '').trim();
    if (!key) return fail(res, 400, 'FEATURE_FLAG_KEY_REQUIRED', 'Flag key is required');
const previous = await featureFlagService.getFlag(key);

const sanitizedRules = {
  ...rules,
  killSwitch: false
};

await featureFlagService.setFlag({
  key,
  enabled: false,
  rolloutPercentage: 0,
  rules: { killSwitch: true },
      description: req.body?.description == null ? previous.description || null : String(req.body.description),
      createdBy: req.user.id
    });

    const nextFlag = await featureFlagService.getFlag(key);

    await appendAudit({
      action: 'feature_flag.kill_switch',
      actorUserId: req.user.id,
      flagKey: key,
      previous,
      next: nextFlag,
      metadata: {
        reason: req.body?.reason ? String(req.body.reason) : 'manual_kill_switch'
      }
    });

    return res.json({ success: true, flag: nextFlag, killSwitchApplied: true });
  } catch (error) {
    return fail(res, 500, 'FEATURE_FLAG_KILL_SWITCH_FAILED', error.message);
  }
});

module.exports = router;
