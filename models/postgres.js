/**
 * PostgreSQL Foundation Layer
 * Phase 1.1: optional connection + health status for gradual migration
 */

let PoolClass = null;
let pool = null;
let lastError = null;

function isEnabled() {
  return process.env.DB_PROVIDER === 'postgres' || !!process.env.DATABASE_URL;
}

function getPool() {
  if (!isEnabled()) return null;
  if (pool) return pool;

  if (!PoolClass) {
    try {
      ({ Pool: PoolClass } = require('pg'));
    } catch (err) {
      lastError = err;
      console.warn('[postgres] pg dependency not installed; PostgreSQL disabled:', err.message);
      return null;
    }
  }

  const ssl = process.env.PG_SSL === 'true';
  pool = new PoolClass({
    connectionString: process.env.DATABASE_URL,
    ssl: ssl ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.PG_POOL_MAX || '10', 10),
    idleTimeoutMillis: parseInt(process.env.PG_IDLE_TIMEOUT_MS || '30000', 10)
  });

  pool.on('error', (err) => {
    lastError = err;
    console.error('[postgres] pool error:', err.message);
  });

  return pool;
}

async function query(text, params = []) {
  const p = getPool();
  if (!p) {
    const err = new Error('PostgreSQL is not configured');
    err.code = 'PG_DISABLED';
    throw err;
  }

  try {
    return await p.query(text, params);
  } catch (err) {
    lastError = err;
    throw err;
  }
}

async function healthCheck() {
  const p = getPool();
  if (!p) {
    return {
      enabled: false,
      ok: false,
      provider: 'json',
      reason: 'DATABASE_URL not set'
    };
  }

  try {
    await p.query('SELECT 1');
    return {
      enabled: true,
      ok: true,
      provider: 'postgres'
    };
  } catch (err) {
    lastError = err;
    return {
      enabled: true,
      ok: false,
      provider: 'postgres',
      reason: err.message
    };
  }
}

module.exports = {
  isEnabled,
  getPool,
  query,
  healthCheck,
  getLastError: () => lastError
};
