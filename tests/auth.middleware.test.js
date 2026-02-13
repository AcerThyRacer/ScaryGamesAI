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

function createReq({ headers = {}, ip = '127.0.0.1', socketIp = '127.0.0.1' } = {}) {
  const normalizedHeaders = {};
  for (const [k, v] of Object.entries(headers)) {
    normalizedHeaders[k.toLowerCase()] = v;
  }

  return {
    headers: normalizedHeaders,
    ip,
    socket: { remoteAddress: socketIp }
  };
}

function createRes() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    }
  };
}

function runMiddleware(middleware, req, res) {
  return new Promise((resolve) => {
    middleware(req, res, () => resolve({ nextCalled: true }));
    setImmediate(() => resolve({ nextCalled: false }));
  });
}

test('auth middleware blocks missing auth header when dev bypass disabled', async () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevBypass = process.env.AUTH_ALLOW_DEV_BYPASS;
  process.env.NODE_ENV = 'development';
  process.env.AUTH_ALLOW_DEV_BYPASS = 'false';

  const middleware = loadWithMocks('../middleware/auth', {
    '../models/database': {
      findOne: () => null
    },
    '../services/authService': {
      verifyAccessToken: () => {
        throw new Error('should not be called');
      },
      isJtiRevoked: async () => false,
      isSessionRevoked: async () => false,
      touchSession: async () => {}
    }
  });

  const req = createReq();
  const res = createRes();
  const result = await runMiddleware(middleware, req, res);

  assert.equal(result.nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.payload?.error?.code, 'AUTH_TOKEN_MISSING');

  process.env.NODE_ENV = prevNodeEnv;
  process.env.AUTH_ALLOW_DEV_BYPASS = prevBypass;
});

test('auth middleware blocks legacy demo token when disabled by env', async () => {
  const prevNodeEnv = process.env.NODE_ENV;
  const prevDisableDemo = process.env.AUTH_DISABLE_DEMO_TOKEN;
  process.env.NODE_ENV = 'development';
  process.env.AUTH_DISABLE_DEMO_TOKEN = 'true';

  const middleware = loadWithMocks('../middleware/auth', {
    '../models/database': {
      findOne: () => null
    },
    '../services/authService': {
      verifyAccessToken: () => {
        const err = new Error('invalid');
        err.code = 'AUTH_TOKEN_INVALID';
        throw err;
      },
      isJtiRevoked: async () => false,
      isSessionRevoked: async () => false,
      touchSession: async () => {}
    }
  });

  const req = createReq({ headers: { authorization: 'Bearer demo-token' } });
  const res = createRes();
  const result = await runMiddleware(middleware, req, res);

  assert.equal(result.nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.payload?.error?.code, 'AUTH_TOKEN_INVALID');

  process.env.NODE_ENV = prevNodeEnv;
  process.env.AUTH_DISABLE_DEMO_TOKEN = prevDisableDemo;
});

test('auth middleware rejects token when session is revoked', async () => {
  const prevNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  let touchCalled = false;
  const middleware = loadWithMocks('../middleware/auth', {
    '../models/database': {
      findOne: () => ({ id: 'u_1', username: 'PlayerOne', email: 'p1@example.com' })
    },
    '../services/authService': {
      verifyAccessToken: () => ({
        sub: 'u_1',
        sid: 'sid_1',
        jti: 'jti_1',
        username: 'PlayerOne',
        email: 'p1@example.com',
        amr: ['pwd']
      }),
      isJtiRevoked: async () => false,
      isSessionRevoked: async () => true,
      touchSession: async () => {
        touchCalled = true;
      }
    }
  });

  const req = createReq({ headers: { authorization: 'Bearer token-1' } });
  const res = createRes();
  const result = await runMiddleware(middleware, req, res);

  assert.equal(result.nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.equal(res.payload?.error?.code, 'AUTH_SESSION_REVOKED');
  assert.equal(touchCalled, false);

  process.env.NODE_ENV = prevNodeEnv;
});
