/**
 * Economy Mutation Service
 * Idempotent mutation helper + audit logging wrappers.
 */

const crypto = require('crypto');
const dataAccess = require('../models/data-access');

function requireNonEmptyString(value, fieldName, maxLength = 255) {
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

function buildHash(payload) {
  if (payload == null) return null;
  const serialized = JSON.stringify(payload);
  return crypto.createHash('sha256').update(serialized).digest('hex');
}

function makeId(prefix = 'eco') {
  const rand = crypto.randomBytes(8).toString('hex');
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

async function appendAuditEvent({
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
  return dataAccess.appendEconomyAuditLog({
    id: makeId('audit'),
    actorUserId,
    targetUserId,
    entityType,
    entityId,
    eventType,
    severity,
    message,
    requestId,
    idempotencyKey,
    metadata
  });
}

function recordEconomyPerf(channel, fields = {}) {
  if (!channel || typeof channel !== 'string') return;
  global.__phase3Perf = global.__phase3Perf || {};
  global.__phase3Perf.economy = global.__phase3Perf.economy || {};
  const bucket = global.__phase3Perf.economy[channel] || {
    calls: 0,
    replays: 0,
    successes: 0,
    failures: 0,
    totalDurationMs: 0
  };

  bucket.calls += fields.calls || 0;
  bucket.replays += fields.replays || 0;
  bucket.successes += fields.successes || 0;
  bucket.failures += fields.failures || 0;
  bucket.totalDurationMs += fields.durationMs || 0;

  if (fields.durationMs != null) {
    bucket.lastDurationMs = fields.durationMs;
    if (!bucket.maxDurationMs || fields.durationMs > bucket.maxDurationMs) {
      bucket.maxDurationMs = fields.durationMs;
    }
  }

  global.__phase3Perf.economy[channel] = bucket;
}

async function executeIdempotentMutation({
  scope,
  idempotencyKey,
  requestPayload = null,
  lockMs = 5 * 60 * 1000,
  actorUserId = null,
  targetUserId = null,
  entityType = 'economy_mutation',
  entityId = null,
  eventType = 'mutation',
  requestId = null,
  perfChannel = null,
  mutationFn
}) {
  const normalizedScope = requireNonEmptyString(scope, 'scope', 120);
  const normalizedIdempotencyKey = requireNonEmptyString(idempotencyKey, 'idempotencyKey', 255);

  if (typeof mutationFn !== 'function') {
    throw new Error('mutationFn must be a function');
  }

  const lockUntil = new Date(Date.now() + Math.max(Number(lockMs) || 0, 0)).toISOString();
  const requestHash = buildHash(requestPayload);
  const perfStart = Date.now();

  const keyRecord = await dataAccess.createIdempotencyKey({
    id: makeId('idem'),
    scope: normalizedScope,
    key: normalizedIdempotencyKey,
    requestHash,
    status: 'in_progress',
    lockedUntil: lockUntil
  });

  if (!keyRecord) {
    throw new Error('Failed to initialize idempotency record');
  }

  if (!keyRecord.inserted) {
    if (requestHash && keyRecord.request_hash && requestHash !== keyRecord.request_hash) {
      const err = new Error('Idempotency key reuse with different payload');
      err.code = 'IDEMPOTENCY_PAYLOAD_MISMATCH';
      throw err;
    }

    if (keyRecord.status === 'succeeded') {
      recordEconomyPerf(perfChannel, {
        calls: 1,
        replays: 1,
        successes: 1,
        durationMs: Date.now() - perfStart
      });
      return {
        replayed: true,
        status: 'succeeded',
        responseCode: keyRecord.response_code,
        responseBody: keyRecord.response_body,
        resourceType: keyRecord.resource_type,
        resourceId: keyRecord.resource_id
      };
    }

    if (keyRecord.status === 'failed') {
      recordEconomyPerf(perfChannel, {
        calls: 1,
        replays: 1,
        failures: 1,
        durationMs: Date.now() - perfStart
      });
      return {
        replayed: true,
        status: 'failed',
        responseCode: keyRecord.response_code,
        responseBody: keyRecord.response_body,
        resourceType: keyRecord.resource_type,
        resourceId: keyRecord.resource_id
      };
    }

    if (keyRecord.locked_until && new Date(keyRecord.locked_until) > new Date()) {
      const err = new Error('Mutation already in progress for this idempotency key');
      err.code = 'IDEMPOTENCY_IN_PROGRESS';
      throw err;
    }
  }

  try {
    const mutationResult = await mutationFn();
    const responseBody = mutationResult == null ? { ok: true } : mutationResult;
    const resourceType = typeof responseBody.resourceType === 'string' ? responseBody.resourceType : null;
    const resourceId = typeof responseBody.resourceId === 'string' ? responseBody.resourceId : null;

    await dataAccess.updateIdempotencyKeyResult({
      scope: normalizedScope,
      key: normalizedIdempotencyKey,
      status: 'succeeded',
      responseCode: 200,
      responseBody,
      resourceType,
      resourceId
    });

    await appendAuditEvent({
      actorUserId,
      targetUserId,
      entityType,
      entityId,
      eventType: `${eventType}.succeeded`,
      severity: 'info',
      requestId,
      idempotencyKey: normalizedIdempotencyKey,
      metadata: {
        scope: normalizedScope,
        replayed: false
      }
    });

    recordEconomyPerf(perfChannel, {
      calls: 1,
      successes: 1,
      durationMs: Date.now() - perfStart
    });

    return {
      replayed: false,
      status: 'succeeded',
      responseCode: 200,
      responseBody,
      resourceType,
      resourceId
    };
  } catch (error) {
    const responseBody = {
      error: error.message,
      code: error.code || 'MUTATION_FAILED'
    };

    await dataAccess.updateIdempotencyKeyResult({
      scope: normalizedScope,
      key: normalizedIdempotencyKey,
      status: 'failed',
      responseCode: 500,
      responseBody
    });

    await appendAuditEvent({
      actorUserId,
      targetUserId,
      entityType,
      entityId,
      eventType: `${eventType}.failed`,
      severity: 'error',
      message: error.message,
      requestId,
      idempotencyKey: normalizedIdempotencyKey,
      metadata: {
        scope: normalizedScope,
        errorCode: error.code || 'MUTATION_FAILED'
      }
    });

    recordEconomyPerf(perfChannel, {
      calls: 1,
      failures: 1,
      durationMs: Date.now() - perfStart
    });
    throw error;
  }
}

module.exports = {
  executeIdempotentMutation,
  appendAuditEvent,
  makeId
};
