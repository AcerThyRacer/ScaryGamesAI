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

test('oauth callback rejects when identity belongs to another user', async () => {
  const prevRequireMatch = process.env.OAUTH_LINKING_REQUIRE_EMAIL_MATCH;
  process.env.OAUTH_LINKING_REQUIRE_EMAIL_MATCH = 'true';

  const queries = [];
  const router = loadWithMocks('../api/auth', {
    '../services/authService': {
      consumeOAuthState: async () => ({ provider: 'google', returnTo: '/' }),
      issueTokenPair: async () => ({
        accessToken: 'a',
        refreshToken: 'r',
        sessionId: 'sid_1',
        expiresIn: 900,
        refreshExpiresIn: 2592000,
        amr: ['pwd']
      }),
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
        queries.push({ sql, params });
        if (sql.includes('INSERT INTO auth_audit_logs')) return { rows: [], rowCount: 1 };
        if (sql.includes('FROM oauth_identities')) {
          return {
            rows: [{ id: 'oid_1', user_id: 'u_other', provider: 'google', provider_user_id: 'gp_1' }],
            rowCount: 1
          };
        }
        return { rows: [], rowCount: 0 };
      }
    }
  });

  const handler = getRouteHandler(router, 'post', '/oauth/:provider/callback');
  const req = createReq({
    params: { provider: 'google' },
    body: { state: 'state_1', providerUserId: 'gp_1', linkUserId: 'u_me', providerEmail: 'me@example.com' }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.payload?.error?.code, 'AUTH_OAUTH_IDENTITY_TAKEN');
  assert.equal(queries.some((q) => q.sql.includes('INSERT INTO oauth_identities')), false);

  process.env.OAUTH_LINKING_REQUIRE_EMAIL_MATCH = prevRequireMatch;
});

test('oauth callback enforces provider/account email match when enabled', async () => {
  const prevRequireMatch = process.env.OAUTH_LINKING_REQUIRE_EMAIL_MATCH;
  process.env.OAUTH_LINKING_REQUIRE_EMAIL_MATCH = 'true';

  const router = loadWithMocks('../api/auth', {
    '../services/authService': {
      consumeOAuthState: async () => ({ provider: 'discord', returnTo: '/games.html' }),
      issueTokenPair: async () => ({
        accessToken: 'a',
        refreshToken: 'r',
        sessionId: 'sid_2',
        expiresIn: 900,
        refreshExpiresIn: 2592000,
        amr: ['pwd']
      }),
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
      query: async (sql) => {
        if (sql.includes('INSERT INTO auth_audit_logs')) return { rows: [], rowCount: 1 };
        if (sql.includes('FROM oauth_identities')) return { rows: [], rowCount: 0 };
        if (sql.includes('SELECT id, username, email FROM users WHERE id = $1 LIMIT 1')) {
          return { rows: [{ id: 'u_1', username: 'UserOne', email: 'owner@example.com' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }
    }
  });

  const handler = getRouteHandler(router, 'post', '/oauth/:provider/callback');
  const req = createReq({
    params: { provider: 'discord' },
    body: {
      state: 'state_2',
      providerUserId: 'disc_1',
      linkUserId: 'u_1',
      providerEmail: 'different@example.com'
    }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.payload?.error?.code, 'AUTH_OAUTH_EMAIL_MISMATCH');

  process.env.OAUTH_LINKING_REQUIRE_EMAIL_MATCH = prevRequireMatch;
});

test('oauth callback links identity and returns tokens on success', async () => {
  const prevRequireMatch = process.env.OAUTH_LINKING_REQUIRE_EMAIL_MATCH;
  process.env.OAUTH_LINKING_REQUIRE_EMAIL_MATCH = 'false';

  let upsertCalled = false;
  const router = loadWithMocks('../api/auth', {
    '../services/authService': {
      consumeOAuthState: async () => ({ provider: 'google', returnTo: '/profile' }),
      issueTokenPair: async () => ({
        accessToken: 'access_123',
        refreshToken: 'refresh_123',
        sessionId: 'sid_3',
        expiresIn: 900,
        refreshExpiresIn: 2592000,
        amr: ['pwd']
      }),
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
      query: async (sql) => {
        if (sql.includes('INSERT INTO auth_audit_logs')) return { rows: [], rowCount: 1 };
        if (sql.includes('FROM oauth_identities')) return { rows: [], rowCount: 0 };
        if (sql.includes('SELECT id, username, email FROM users WHERE id = $1 LIMIT 1')) {
          return { rows: [{ id: 'u_2', username: 'UserTwo', email: 'u2@example.com' }], rowCount: 1 };
        }
        if (sql.includes('INSERT INTO oauth_identities')) {
          upsertCalled = true;
          return { rows: [], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }
    }
  });

  const handler = getRouteHandler(router, 'post', '/oauth/:provider/callback');
  const req = createReq({
    params: { provider: 'google' },
    body: {
      state: 'state_3',
      providerUserId: 'google_22',
      linkUserId: 'u_2',
      providerEmail: 'oauth@example.com'
    }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload?.success, true);
  assert.equal(res.payload?.linked, true);
  assert.equal(res.payload?.tokens?.accessToken, 'access_123');
  assert.equal(upsertCalled, true);

  process.env.OAUTH_LINKING_REQUIRE_EMAIL_MATCH = prevRequireMatch;
});

test('oauth callback exchanges google code and links using provider profile', async () => {
  const prevRequireMatch = process.env.OAUTH_LINKING_REQUIRE_EMAIL_MATCH;
  process.env.OAUTH_LINKING_REQUIRE_EMAIL_MATCH = 'false';

  let upsertCalled = false;
  const router = loadWithMocks('../api/auth', {
    '../services/authService': {
      consumeOAuthState: async () => ({ provider: 'google', returnTo: '/profile' }),
      exchangeOAuthCode: async () => ({
        accessToken: 'google_access',
        refreshToken: 'google_refresh',
        scope: 'openid email profile',
        idToken: 'header.payload.sig'
      }),
      fetchOAuthProfile: async () => ({
        providerUserId: 'google_sub_55',
        providerEmail: 'resolved@example.com',
        profile: { sub: 'google_sub_55', email: 'resolved@example.com' }
      }),
      issueTokenPair: async () => ({
        accessToken: 'access_code',
        refreshToken: 'refresh_code',
        sessionId: 'sid_code',
        expiresIn: 900,
        refreshExpiresIn: 2592000,
        amr: ['pwd']
      }),
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
      query: async (sql) => {
        if (sql.includes('INSERT INTO auth_audit_logs')) return { rows: [], rowCount: 1 };
        if (sql.includes('FROM oauth_identities')) return { rows: [], rowCount: 0 };
        if (sql.includes('SELECT id, username, email FROM users WHERE lower(email) = lower($1) LIMIT 1')) {
          return { rows: [{ id: 'u_3', username: 'UserThree', email: 'resolved@example.com' }], rowCount: 1 };
        }
        if (sql.includes('INSERT INTO oauth_identities')) {
          upsertCalled = true;
          return { rows: [], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }
    }
  });

  const handler = getRouteHandler(router, 'post', '/oauth/:provider/callback');
  const req = createReq({
    params: { provider: 'google' },
    body: {
      state: 'state_code_google',
      code: 'code_123'
    }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload?.success, true);
  assert.equal(res.payload?.identity?.providerUserId, 'google_sub_55');
  assert.equal(res.payload?.identity?.providerEmail, 'resolved@example.com');
  assert.equal(upsertCalled, true);

  process.env.OAUTH_LINKING_REQUIRE_EMAIL_MATCH = prevRequireMatch;
});

test('oauth callback derives steam provider user id from claimed OpenID identity', async () => {
  const prevRequireMatch = process.env.OAUTH_LINKING_REQUIRE_EMAIL_MATCH;
  process.env.OAUTH_LINKING_REQUIRE_EMAIL_MATCH = 'false';

  let seenProviderUserId = null;
  const router = loadWithMocks('../api/auth', {
    '../services/authService': {
      consumeOAuthState: async () => ({ provider: 'steam', returnTo: '/games.html' }),
      issueTokenPair: async () => ({
        accessToken: 'steam_access',
        refreshToken: 'steam_refresh',
        sessionId: 'sid_steam',
        expiresIn: 900,
        refreshExpiresIn: 2592000,
        amr: ['pwd']
      }),
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
        if (sql.includes('INSERT INTO auth_audit_logs')) return { rows: [], rowCount: 1 };
        if (sql.includes('FROM oauth_identities')) return { rows: [], rowCount: 0 };
        if (sql.includes('SELECT id, username, email FROM users WHERE id = $1 LIMIT 1')) {
          return { rows: [{ id: 'u_steam', username: 'SteamUser', email: null }], rowCount: 1 };
        }
        if (sql.includes('INSERT INTO oauth_identities')) {
          seenProviderUserId = params?.[3] || null;
          return { rows: [], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      }
    }
  });

  const handler = getRouteHandler(router, 'post', '/oauth/:provider/callback');
  const req = createReq({
    params: { provider: 'steam' },
    body: {
      state: 'state_steam',
      linkUserId: 'u_steam',
      steamOpenId: {
        claimed_id: 'https://steamcommunity.com/openid/id/76561198000000000'
      }
    }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload?.success, true);
  assert.equal(seenProviderUserId, '76561198000000000');
  assert.equal(res.payload?.identity?.providerUserId, '76561198000000000');

  process.env.OAUTH_LINKING_REQUIRE_EMAIL_MATCH = prevRequireMatch;
});

test('oauth callback auto-provisions a user when no matching account exists', async () => {
  const prevRequireMatch = process.env.OAUTH_LINKING_REQUIRE_EMAIL_MATCH;
  process.env.OAUTH_LINKING_REQUIRE_EMAIL_MATCH = 'true';

  let userInsertCalled = false;
  const router = loadWithMocks('../api/auth', {
    '../services/authService': {
      consumeOAuthState: async () => ({ provider: 'google', returnTo: '/games.html' }),
      exchangeOAuthCode: async () => ({
        accessToken: 'new_access',
        refreshToken: 'new_refresh',
        scope: 'openid email profile',
        idToken: 'header.payload.sig'
      }),
      fetchOAuthProfile: async () => ({
        providerUserId: 'google_new_user',
        providerEmail: 'new-user@example.com',
        profile: { sub: 'google_new_user', email: 'new-user@example.com', name: 'New User' }
      }),
      issueTokenPair: async () => ({
        accessToken: 'access_new',
        refreshToken: 'refresh_new',
        sessionId: 'sid_new',
        expiresIn: 900,
        refreshExpiresIn: 2592000,
        amr: ['pwd']
      }),
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
      query: async (sql) => {
        if (sql.includes('INSERT INTO auth_audit_logs')) return { rows: [], rowCount: 1 };
        if (sql.includes('FROM oauth_identities')) return { rows: [], rowCount: 0 };
        if (sql.includes('SELECT id, username, email FROM users WHERE lower(email) = lower($1) LIMIT 1')) {
          return { rows: [], rowCount: 0 };
        }
        if (sql.includes('INSERT INTO users (id, username, email, created_at, updated_at)')) {
          userInsertCalled = true;
          return { rows: [{ id: 'u_new', username: 'NewUser', email: 'new-user@example.com' }], rowCount: 1 };
        }
        if (sql.includes('INSERT INTO oauth_identities')) return { rows: [], rowCount: 1 };
        return { rows: [], rowCount: 0 };
      }
    }
  });

  const handler = getRouteHandler(router, 'post', '/oauth/:provider/callback');
  const req = createReq({
    params: { provider: 'google' },
    body: {
      state: 'state_new_user',
      code: 'code_new_user'
    }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload?.success, true);
  assert.equal(res.payload?.linked, true);
  assert.equal(res.payload?.user?.email, 'new-user@example.com');
  assert.equal(userInsertCalled, true);

  process.env.OAUTH_LINKING_REQUIRE_EMAIL_MATCH = prevRequireMatch;
});
