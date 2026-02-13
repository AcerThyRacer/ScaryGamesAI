/**
 * Environment validation for production startup safety.
 */

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function getMissingRequiredVars() {
  const required = ['PORT'];

  if (isProduction()) {
    required.push('JWT_SECRET');
  }

  if (process.env.DB_PROVIDER === 'postgres') {
    required.push('DATABASE_URL');
  }

  const missing = [];
  for (const key of required) {
    const value = process.env[key];
    if (value == null || String(value).trim() === '') {
      missing.push(key);
    }
  }

  return missing;
}

function boolFromEnv(key, fallback = false) {
  const value = process.env[key];
  if (value == null) return fallback;
  return String(value).toLowerCase() === 'true';
}

function getUnsafeProductionFlags() {
  if (!isProduction()) return [];

  const unsafe = [];

  if (boolFromEnv('AUTH_ALLOW_DEV_BYPASS', false)) {
    unsafe.push('AUTH_ALLOW_DEV_BYPASS=true');
  }

  if (!boolFromEnv('AUTH_DISABLE_DEMO_TOKEN', true)) {
    unsafe.push('AUTH_DISABLE_DEMO_TOKEN=false');
  }

  if (!boolFromEnv('AUTH_COOKIE_SECURE', true)) {
    unsafe.push('AUTH_COOKIE_SECURE=false');
  }

  const rlVars = ['RATE_LIMIT_API_PER_MINUTE', 'RATE_LIMIT_API_V1_PER_MINUTE', 'RATE_LIMIT_API_V2_PER_MINUTE'];
  for (const key of rlVars) {
    const raw = process.env[key];
    if (raw == null || String(raw).trim() === '') continue;
    const parsed = parseInt(String(raw), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      unsafe.push(`${key}<=0_or_invalid`);
    }
  }

  return unsafe;
}

function validateEnvironment() {
  const missing = getMissingRequiredVars();
  if (missing.length) {
    const err = new Error(`Missing required environment variables: ${missing.join(', ')}`);
    err.code = 'ENV_VALIDATION_FAILED';
    throw err;
  }

  const unsafe = getUnsafeProductionFlags();
  if (unsafe.length) {
    const err = new Error(`Unsafe production environment flags: ${unsafe.join(', ')}`);
    err.code = 'ENV_UNSAFE_PRODUCTION_FLAGS';
    throw err;
  }
}

module.exports = {
  validateEnvironment,
  getMissingRequiredVars,
  getUnsafeProductionFlags,
  isProduction
};
