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

function createAuthMock() {
  const auth = (req, _res, next) => next();
  auth.requireMonetizationAuth = (req, _res, next) => next();
  return auth;
}

function createReq({ body = {}, params = {}, query = {}, headers = {}, userId = 'user_1' } = {}) {
  const normalizedHeaders = {};
  for (const [k, v] of Object.entries(headers)) {
    normalizedHeaders[k.toLowerCase()] = v;
  }

  return {
    body,
    params,
    query,
    user: { id: userId },
    headers: normalizedHeaders,
    header(name) {
      return this.headers[String(name).toLowerCase()] || null;
    }
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

function getRouteHandler(router, method, path) {
  const layer = router.stack.find((entry) => entry.route
    && entry.route.path === path
    && entry.route.methods[method]);

  assert.ok(layer, `Route not found: ${method.toUpperCase()} ${path}`);
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

test('engagement free daily spin route returns created payload', async () => {
  let observedScope = null;
  let observedPerfChannel = null;

  const router = loadWithMocks('../api/engagement', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': { isEnabled: () => true },
    '../services/economyMutationService': {
      executeIdempotentMutation: async (opts) => {
        observedScope = opts.scope;
        observedPerfChannel = opts.perfChannel;
        return {
          replayed: false,
          responseBody: {
            spinId: 'spin_1',
            spinType: 'free',
            reward: { rewardType: 'souls', amount: 800 },
            balances: { souls: 1800, gems: 10 }
          }
        };
      },
      appendAuditEvent: async () => {},
      makeId: () => 'id_1'
    }
  });

  const handler = getRouteHandler(router, 'post', '/daily-spin/free');
  const req = createReq({
    headers: { 'idempotency-key': 'idem-spin-1' }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(observedScope, 'engagement.daily_spin.free');
  assert.equal(observedPerfChannel, 'engagement.daily_spin.free');
  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.spinType, 'free');
  assert.equal(res.payload.reward.amount, 800);
});

test('engagement premium spin rejects missing idempotency key', async () => {
  const router = loadWithMocks('../api/engagement', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': { isEnabled: () => true },
    '../services/economyMutationService': {
      executeIdempotentMutation: async () => {
        throw new Error('should not be called');
      },
      appendAuditEvent: async () => {},
      makeId: () => 'id_2'
    }
  });

  const handler = getRouteHandler(router, 'post', '/daily-spin/premium');
  const req = createReq();
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.error.code, 'IDEMPOTENCY_KEY_REQUIRED');
});

test('engagement crafting combine route returns crafted output payload', async () => {
  let observedScope = null;

  const router = loadWithMocks('../api/engagement', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': { isEnabled: () => true },
    '../services/economyMutationService': {
      executeIdempotentMutation: async (opts) => {
        observedScope = opts.scope;
        return {
          replayed: false,
          responseBody: {
            craftId: 'craft_1',
            gemCost: 15,
            output: { itemKey: 'skin_hunter', rarity: 'rare', craftExclusive: false },
            remainingGems: 42
          }
        };
      },
      appendAuditEvent: async () => {},
      makeId: () => 'id_3'
    }
  });

  const handler = getRouteHandler(router, 'post', '/crafting/skins/combine');
  const req = createReq({
    body: {
      itemKeys: ['skin_shadow', 'skin_bloodied', 'skin_woodsman']
    },
    headers: { 'idempotency-key': 'idem-craft-1' }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(observedScope, 'engagement.crafting.skin_combine');
  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.gemCost, 15);
  assert.equal(res.payload.output.rarity, 'rare');
});

test('engagement premium currency sources route returns f2p estimate and conversion config', async () => {
  const postgresMock = {
    isEnabled: () => true,
    query: async (sql) => {
      const text = String(sql).replace(/\s+/g, ' ').trim();
      if (text.includes('SELECT id, horror_coins, gem_dust') && text.includes('FROM users')) {
        return { rows: [{ id: 'user_1', horror_coins: 1200, gem_dust: 340, blood_gems: 12 }] };
      }
      if (text.includes("SELECT date_trunc('month'")) {
        return { rows: [{ month_start: '2026-02-01' }] };
      }
      if (text.includes('FROM gem_dust_conversion_claims')) {
        return { rows: [{ converted: 20 }] };
      }
      throw new Error(`Unexpected SQL in test: ${text}`);
    }
  };

  const router = loadWithMocks('../api/engagement', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': postgresMock,
    '../services/economyMutationService': {
      executeIdempotentMutation: async () => ({}),
      appendAuditEvent: async () => {},
      makeId: () => 'id_4'
    }
  });

  const handler = getRouteHandler(router, 'get', '/premium-currency/sources');
  const res = createRes();
  await handler(createReq(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.estimatedMonthlyF2pGems.min, 1000);
  assert.equal(res.payload.estimatedMonthlyF2pGems.max, 2000);
  assert.equal(res.payload.gemDustConversion.rateDustPerGem, 100);
  assert.equal(res.payload.gemDustConversion.monthlyCapGems, 500);
});

test('engagement gem dust convert route returns converted payload', async () => {
  let observedScope = null;
  let observedPerfChannel = null;

  const router = loadWithMocks('../api/engagement', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': { isEnabled: () => true },
    '../services/economyMutationService': {
      executeIdempotentMutation: async (opts) => {
        observedScope = opts.scope;
        observedPerfChannel = opts.perfChannel;
        return {
          replayed: false,
          responseBody: {
            conversionId: 'gdconv_1',
            gemsConverted: 3,
            dustSpent: 300,
            balances: { gems: 23, gemDust: 40 }
          }
        };
      },
      appendAuditEvent: async () => {},
      makeId: () => 'id_5'
    }
  });

  const handler = getRouteHandler(router, 'post', '/gem-dust/convert');
  const req = createReq({
    body: { gems: 3 },
    headers: { 'idempotency-key': 'idem-gem-convert-1' }
  });
  const res = createRes();
  await handler(req, res);

  assert.equal(observedScope, 'engagement.gem_dust.convert');
  assert.equal(observedPerfChannel, 'engagement.gem_dust.convert');
  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.gemsConverted, 3);
  assert.equal(res.payload.dustSpent, 300);
});

test('battle pass v2 gift-tier route returns created payload', async () => {
  let observedScope = null;
  let observedPerfChannel = null;

  const router = loadWithMocks('../api/subscriptions', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': { isEnabled: () => true },
    '../models/database': {},
    '../models/data-access': {},
    '../services/cacheService': { getJson: async () => null, setJson: async () => {} },
    '../services/paymentService': {},
    '../services/battlePassService': {},
    '../services/aiService': {},
    '../services/battlePassServiceV2': {},
    '../services/economyMutationService': {
      executeIdempotentMutation: async (opts) => {
        observedScope = opts.scope;
        observedPerfChannel = opts.perfChannel;
        return {
          replayed: false,
          responseBody: {
            giftId: 'gift_1',
            recipientUserId: 'user_2',
            tierCount: 2,
            xpGranted: 2000,
            gemCost: 20,
            recipientNewTier: 4
          }
        };
      },
      appendAuditEvent: async () => {},
      makeId: () => 'id_4'
    }
  });

  const handler = getRouteHandler(router, 'post', '/battle-pass/v2/gift-tier');
  const req = createReq({
    body: {
      recipientUserId: 'user_2',
      tierCount: 2
    },
    headers: { 'idempotency-key': 'idem-bp-gift-1' }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(observedScope, 'battlepass.v2.gift_tier');
  assert.equal(observedPerfChannel, 'battlepass.v2.gift_tier');
  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.gemCost, 20);
  assert.equal(res.payload.xpGranted, 2000);
});

test('loyalty status returns expanded tiers with derived immortal benefits', async () => {
  const postgresMock = {
    isEnabled: () => true,
    query: async (sql) => {
      const text = String(sql).replace(/\s+/g, ' ').trim();
      if (text.includes('INSERT INTO loyalty_accounts')) return { rows: [] };
      if (text.includes('SELECT user_id AS "userId", points, lifetime_points AS "lifetimePoints", tier')) {
        return {
          rows: [{
            userId: 'user_1',
            points: 12000,
            lifetimePoints: 52000,
            tier: 'bronze',
            updatedAt: '2026-02-13T00:00:00.000Z'
          }]
        };
      }
      throw new Error(`Unexpected SQL in test: ${text}`);
    }
  };

  const router = loadWithMocks('../api/loyalty', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': postgresMock,
    '../services/economyMutationService': {
      executeIdempotentMutation: async () => ({}),
      appendAuditEvent: async () => {},
      makeId: () => 'id_5'
    }
  });

  const handler = getRouteHandler(router, 'get', '/status');
  const req = createReq();
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.account.tier, 'immortal');
  assert.equal(res.payload.currentTierBenefits.storeDiscountPct, 20);
  assert.equal(res.payload.tierBenefits.obsidian.marketplaceAccess, 'exclusive');
});
