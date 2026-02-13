const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function loadWithMocks(targetModulePath, mocks) {
  const target = require.resolve(targetModulePath);
  delete require.cache[target];

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (Object.prototype.hasOwnProperty.call(mocks, request)) {
      return mocks[request];
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return require(targetModulePath);
  } finally {
    Module._load = originalLoad;
  }
}

function createReq({ body = {}, params = {}, query = {}, headers = {}, ip = '127.0.0.1' } = {}) {
  const normalizedHeaders = {};
  for (const [k, v] of Object.entries(headers)) {
    normalizedHeaders[k.toLowerCase()] = v;
  }

  return {
    body,
    params,
    query,
    headers: normalizedHeaders,
    ip,
    socket: { remoteAddress: ip },
    secure: false,
    path: '/mock',
    method: 'POST',
    header(name) {
      return this.headers[String(name).toLowerCase()] || null;
    }
  };
}

function createRes() {
  return {
    statusCode: 200,
    payload: null,
    headers: [],
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
    append(name, value) {
      this.headers.push({ name, value });
      return this;
    }
  };
}

function getRouteHandler(router, method, path) {
  const layer = router.stack.find((entry) => entry.route
    && entry.route.path === path
    && entry.route.methods[method]);

  assert.ok(layer, `Route not found: ${method.toUpperCase()} ${path}`);
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

test('phase2 security: auth service encrypts/decrypts TOTP secrets', () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevJwtSecret = process.env.JWT_SECRET;
  const prevTotpKey = process.env.AUTH_TOTP_ENCRYPTION_KEY;

  process.env.NODE_ENV = 'development';
  process.env.JWT_SECRET = 'unit-test-jwt-secret';
  delete process.env.AUTH_TOTP_ENCRYPTION_KEY;

  const authService = require('../services/authService');
  const secret = 'JBSWY3DPEHPK3PXP';

  const encrypted = authService.encryptTotpSecret(secret);
  assert.ok(typeof encrypted === 'string');
  assert.notEqual(encrypted, secret);
  assert.ok(encrypted.startsWith('v1:'));

  const decrypted = authService.decryptTotpSecret(encrypted);
  assert.equal(decrypted, secret);

  process.env.NODE_ENV = prevNodeEnv;
  process.env.JWT_SECRET = prevJwtSecret;
  process.env.AUTH_TOTP_ENCRYPTION_KEY = prevTotpKey;
});

test('phase2 security: 2fa enrollment stores encrypted secret instead of plaintext', async () => {
  let capturedSecret = null;
  const router = loadWithMocks('../api/auth', {
    '../services/authService': {
      generateTotpSecret: () => 'JBSWY3DPEHPK3PXP',
      generateBackupCodes: () => ['AAAAA-BBBBB'],
      hashBackupCode: (code) => `hash:${code}`,
      encryptTotpSecret: (secret) => {
        capturedSecret = secret;
        return 'v1:encrypted:tag:cipher';
      },
      verifyAccessToken: () => {
        throw new Error('missing bearer');
      },
      isJtiRevoked: async () => false,
      isSessionRevoked: async () => false,
      touchSession: async () => {}
    },
    '../models/database': {
      findOne: () => null
    },
    '../models/postgres': {
      isEnabled: () => true,
      query: async (sql, params) => {
        if (sql.includes('INSERT INTO user_2fa')) {
          assert.equal(params[1], 'u_2fa');
          assert.equal(params[2], 'v1:encrypted:tag:cipher');
          assert.notEqual(params[2], 'JBSWY3DPEHPK3PXP');
        }
        return { rows: [], rowCount: 1 };
      }
    }
  });

  const handler = getRouteHandler(router, 'post', '/2fa/enroll');
  const req = createReq({ body: { userId: 'u_2fa' } });
  const res = createRes();

  await handler(req, res);

  assert.equal(capturedSecret, 'JBSWY3DPEHPK3PXP');
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload?.success, true);
});

test('phase2 security: production unsafe flags are rejected', () => {
  const snapshot = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    JWT_SECRET: process.env.JWT_SECRET,
    AUTH_ALLOW_DEV_BYPASS: process.env.AUTH_ALLOW_DEV_BYPASS,
    AUTH_DISABLE_DEMO_TOKEN: process.env.AUTH_DISABLE_DEMO_TOKEN,
    AUTH_COOKIE_SECURE: process.env.AUTH_COOKIE_SECURE,
    RATE_LIMIT_API_PER_MINUTE: process.env.RATE_LIMIT_API_PER_MINUTE,
    RATE_LIMIT_API_V1_PER_MINUTE: process.env.RATE_LIMIT_API_V1_PER_MINUTE,
    RATE_LIMIT_API_V2_PER_MINUTE: process.env.RATE_LIMIT_API_V2_PER_MINUTE
  };

  process.env.NODE_ENV = 'production';
  process.env.PORT = '9999';
  process.env.JWT_SECRET = 'prod-secret';
  process.env.AUTH_ALLOW_DEV_BYPASS = 'true';
  process.env.AUTH_DISABLE_DEMO_TOKEN = 'false';
  process.env.AUTH_COOKIE_SECURE = 'false';
  process.env.RATE_LIMIT_API_PER_MINUTE = '0';

  const env = require('../config/env');

  const unsafe = env.getUnsafeProductionFlags();
  assert.ok(unsafe.includes('AUTH_ALLOW_DEV_BYPASS=true'));
  assert.ok(unsafe.includes('AUTH_DISABLE_DEMO_TOKEN=false'));
  assert.ok(unsafe.includes('AUTH_COOKIE_SECURE=false'));
  assert.ok(unsafe.includes('RATE_LIMIT_API_PER_MINUTE<=0_or_invalid'));

  assert.throws(() => env.validateEnvironment(), /Unsafe production environment flags/);

  process.env.NODE_ENV = snapshot.NODE_ENV;
  process.env.PORT = snapshot.PORT;
  process.env.JWT_SECRET = snapshot.JWT_SECRET;
  process.env.AUTH_ALLOW_DEV_BYPASS = snapshot.AUTH_ALLOW_DEV_BYPASS;
  process.env.AUTH_DISABLE_DEMO_TOKEN = snapshot.AUTH_DISABLE_DEMO_TOKEN;
  process.env.AUTH_COOKIE_SECURE = snapshot.AUTH_COOKIE_SECURE;
  process.env.RATE_LIMIT_API_PER_MINUTE = snapshot.RATE_LIMIT_API_PER_MINUTE;
  process.env.RATE_LIMIT_API_V1_PER_MINUTE = snapshot.RATE_LIMIT_API_V1_PER_MINUTE;
  process.env.RATE_LIMIT_API_V2_PER_MINUTE = snapshot.RATE_LIMIT_API_V2_PER_MINUTE;
});

test('phase2 security: login redacts internal errors', async () => {
  const router = loadWithMocks('../api/auth', {
    '../services/authService': {
      issueTokenPair: async () => {
        const err = new Error('database connection timeout details');
        err.code = 'DB_TIMEOUT';
        throw err;
      },
      verifyAccessToken: () => {
        throw new Error('missing bearer');
      },
      isJtiRevoked: async () => false,
      isSessionRevoked: async () => false,
      touchSession: async () => {}
    },
    '../models/database': {
      findOne: () => ({ id: 'u_redact', username: 'RedactedUser', email: 'redacted@example.com' })
    },
    '../models/postgres': {
      isEnabled: () => false,
      query: async () => ({ rows: [], rowCount: 0 })
    }
  });

  const handler = getRouteHandler(router, 'post', '/login');
  const req = createReq({ body: { username: 'RedactedUser' } });
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.payload?.error?.code, 'AUTH_LOGIN_FAILED');
  assert.equal(res.payload?.error?.message, 'Login failed');
  assert.equal(String(res.payload?.error?.message || '').includes('database connection timeout details'), false);
});

test('phase2 security: store endpoint redacts internal errors', async () => {
  const mockedAuthMiddleware = (req, _res, next) => {
    req.user = { id: 'u_store' };
    next();
  };

  const router = loadWithMocks('../api/store', {
    '../middleware/auth': Object.assign(mockedAuthMiddleware, {
      requireMonetizationAuth: mockedAuthMiddleware
    }),
    '../models/postgres': {
      isEnabled: () => true,
      query: async () => {
        throw new Error('PG: relation seasonal_store_items missing');
      }
    },
    '../services/economyMutationService': {
      executeIdempotentMutation: async () => {
        throw new Error('not used');
      },
      appendAuditEvent: async () => {},
      makeId: () => 'id'
    }
  });

  const handler = getRouteHandler(router, 'get', '/seasonal');
  const req = createReq();
  req.user = { id: 'u_store' };
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.payload?.error?.code, 'STORE_SEASONAL_FETCH_FAILED');
  assert.equal(res.payload?.error?.message, 'Unable to load seasonal store right now');
  assert.equal(String(res.payload?.error?.message || '').includes('relation seasonal_store_items'), false);
});
