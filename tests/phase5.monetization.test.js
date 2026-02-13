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
  const auth = (req, res, next) => next();
  auth.requireMonetizationAuth = (req, res, next) => next();
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

test('5.1 seasonal purchase route returns created payload', async () => {
  let observedScope = null;
  let observedPerfChannel = null;

  const router = loadWithMocks('../api/store', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': { isEnabled: () => true },
    '../services/economyMutationService': {
      executeIdempotentMutation: async (opts) => {
        observedScope = opts.scope;
        observedPerfChannel = opts.perfChannel;
        return {
          replayed: false,
          responseBody: { itemKey: 'pumpkin_mask', spentCoins: 200 }
        };
      },
      appendAuditEvent: async () => {},
      makeId: () => 'id_1'
    }
  });

  const handler = getRouteHandler(router, 'post', '/seasonal/purchase');
  const req = createReq({
    body: { itemKey: 'pumpkin_mask', quantity: 1 },
    headers: { 'idempotency-key': 'idem-store-1' }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(observedScope, 'store.seasonal.purchase');
  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.spentCoins, 200);
  assert.equal(observedPerfChannel, 'store.seasonal.purchase');
});

test('5.1 marketplace buy route returns tax flow payload', async () => {
  let observedScope = null;
  let observedPerfChannel = null;

  const router = loadWithMocks('../api/marketplace', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': { isEnabled: () => true },
    '../services/economyMutationService': {
      executeIdempotentMutation: async (opts) => {
        observedScope = opts.scope;
        observedPerfChannel = opts.perfChannel;
        return {
          replayed: false,
          responseBody: {
            listingId: 'ml_1',
            taxAmount: 100,
            sellerNetAmount: 900
          }
        };
      },
      appendAuditEvent: async () => {},
      makeId: () => 'id_1'
    }
  });

  const handler = getRouteHandler(router, 'post', '/listings/:listingId/buy');
  const req = createReq({
    params: { listingId: 'ml_1' },
    headers: { 'idempotency-key': 'idem-market-buy-1' }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(observedScope, 'marketplace.listing.buy');
  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.taxAmount, 100);
  assert.equal(res.payload.sellerNetAmount, 900);
  assert.equal(observedPerfChannel, 'marketplace.listing.buy');
});

test('5.1 marketplace cancel route returns canceled payload', async () => {
  let observedScope = null;

  const router = loadWithMocks('../api/marketplace', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': { isEnabled: () => true },
    '../services/economyMutationService': {
      executeIdempotentMutation: async (opts) => {
        observedScope = opts.scope;
        return {
          replayed: false,
          responseBody: {
            listingId: 'ml_2',
            status: 'canceled',
            itemReturned: 'blade'
          }
        };
      },
      appendAuditEvent: async () => {},
      makeId: () => 'id_1'
    }
  });

  const handler = getRouteHandler(router, 'post', '/listings/:listingId/cancel');
  const req = createReq({
    params: { listingId: 'ml_2' },
    headers: { 'idempotency-key': 'idem-market-cancel-1' }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(observedScope, 'marketplace.listing.cancel');
  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.status, 'canceled');
});

test('5.1 item gift route returns delivered payload', async () => {
  let observedScope = null;

  const router = loadWithMocks('../api/gifts', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': { isEnabled: () => true },
    '../services/economyMutationService': {
      executeIdempotentMutation: async (opts) => {
        observedScope = opts.scope;
        return {
          replayed: false,
          responseBody: {
            giftId: 'gift_1',
            status: 'delivered',
            itemKey: 'crown'
          }
        };
      },
      makeId: () => 'id_1'
    }
  });

  const handler = getRouteHandler(router, 'post', '/item');
  const req = createReq({
    body: { recipientUserId: 'user_2', itemKey: 'crown' },
    headers: { 'idempotency-key': 'idem-gift-1' }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(observedScope, 'gifts.item.send');
  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.status, 'delivered');
});

test('5.1 ads watch-to-earn complete route returns reward payload', async () => {
  let observedScope = null;

  const router = loadWithMocks('../api/ads', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': { isEnabled: () => true },
    '../services/economyMutationService': {
      executeIdempotentMutation: async (opts) => {
        observedScope = opts.scope;
        return {
          replayed: false,
          responseBody: { sessionId: 'adw_1', rewardCoins: 25, currentCoins: 125 }
        };
      },
      appendAuditEvent: async () => {},
      makeId: () => 'id_1'
    }
  });

  const handler = getRouteHandler(router, 'post', '/complete');
  const req = createReq({
    body: { sessionId: 'adw_1', nonce: 'nonce_1' },
    headers: { 'idempotency-key': 'idem-ads-1' }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(observedScope, 'ads.watch.complete');
  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.rewardCoins, 25);
});

test('5.1 loyalty claim route returns claimed payload', async () => {
  let observedScope = null;

  const router = loadWithMocks('../api/loyalty', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': { isEnabled: () => true },
    '../services/economyMutationService': {
      executeIdempotentMutation: async (opts) => {
        observedScope = opts.scope;
        return {
          replayed: false,
          responseBody: { claimId: 'lclaim_1', rewardKey: 'SILVER_STASH', coinsAwarded: 300 }
        };
      },
      appendAuditEvent: async () => {},
      makeId: () => 'id_1'
    }
  });

  const handler = getRouteHandler(router, 'post', '/claim');
  const req = createReq({
    body: { rewardKey: 'SILVER_STASH' },
    headers: { 'idempotency-key': 'idem-loyalty-1' }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(observedScope, 'loyalty.claim');
  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.rewardKey, 'SILVER_STASH');
});

test('5.2 BP v2 event ingest validates event type', async () => {
  const service = loadWithMocks('../services/battlePassServiceV2', {
    '../models/postgres': {
      isEnabled: () => true,
      query: async () => ({ rows: [] })
    },
    '../models/data-access': {
      getActiveBattlePassSeason: async () => ({ id: 'season_1', base_xp_per_tier: 100 }),
      getBattlePassUserProgress: async () => ({ id: 'prog_1', xp: 0, level: 1 })
    },
    './economyMutationService': {
      appendAuditEvent: async () => {},
      makeId: () => 'id_1'
    }
  });

  await assert.rejects(
    () => service.ingestQuestEvent('user_1', { eventType: 'bad-event', eventValue: 1 }),
    (err) => err && err.code === 'INVALID_EVENT_TYPE'
  );
});

test('5.2 BP v2 tier claim prevents duplicate claim', async () => {
  const service = loadWithMocks('../services/battlePassServiceV2', {
    '../models/postgres': {
      isEnabled: () => true,
      query: async () => ({ rows: [] })
    },
    '../models/data-access': {
      getActiveBattlePassSeason: async () => ({ id: 'season_1', base_xp_per_tier: 100 }),
      getBattlePassUserProgress: async () => ({ id: 'prog_1', xp: 300, level: 4 }),
      listBattlePassClaims: async () => ([{ tier_number: 2 }]),
      listBattlePassRetroactiveClaims: async () => ([])
    },
    './economyMutationService': {
      appendAuditEvent: async () => {},
      makeId: () => 'id_1'
    }
  });

  await assert.rejects(
    () => service.claimTierReward('user_1', { tierNumber: 2 }),
    (err) => err && err.code === 'DUPLICATE_CLAIM'
  );
});

test('5.2 BP v2 team contribution enforces daily cap', async () => {
  const service = loadWithMocks('../services/battlePassServiceV2', {
    '../models/postgres': {
      isEnabled: () => true,
      query: async () => ({ rows: [] })
    },
    '../models/data-access': {
      getActiveBattlePassSeason: async () => ({
        id: 'season_1',
        base_xp_per_tier: 100,
        team_daily_contribution_cap: 200
      }),
      getBattlePassTeamForUser: async () => ({ id: 'team_1', total_xp: 1000 }),
      getBattlePassTeamDailyContribution: async () => ({ id: 'daily_1', contributed_xp: 200 })
    },
    './economyMutationService': {
      appendAuditEvent: async () => {},
      makeId: () => 'id_1'
    }
  });

  await assert.rejects(
    () => service.contributeTeamXp('user_1', { xpAmount: 50 }),
    (err) => err && err.code === 'DAILY_TEAM_CONTRIBUTION_CAP_REACHED'
  );
});

test('5.2 BP v2 retroactive claim is idempotent on duplicate rows', async () => {
  let callCount = 0;
  const appliedRewards = [];

  const service = loadWithMocks('../services/battlePassServiceV2', {
    '../models/postgres': {
      isEnabled: () => true,
      query: async () => ({ rows: [] })
    },
    '../models/data-access': {
      getActiveBattlePassSeason: async () => ({
        id: 'season_1',
        base_xp_per_tier: 100,
        repeatable_currency_amount: 50
      }),
      getBattlePassUserProgress: async () => ({ id: 'prog_1', xp: 300, level: 4 }),
      listBattlePassClaims: async () => ([]),
      listBattlePassRetroactiveClaims: async () => ([]),
      getBattlePassTierReward: async (_seasonId, tier) => ({
        tier_number: tier,
        reward_type: 'currency',
        reward_name: `Tier ${tier}`,
        reward_amount: 100,
        reward_tier: 'common',
        metadata: {}
      }),
      createBattlePassRetroactiveClaim: async () => {
        callCount += 1;
        if (callCount === 2) {
          const err = new Error('duplicate');
          err.code = '23505';
          throw err;
        }
      },
      createBattlePassRewardClaim: async () => {}
    },
    './economyMutationService': {
      appendAuditEvent: async () => {},
      makeId: () => 'id_1'
    }
  });

  service.applyRewardToUser = async (_userId, reward) => {
    appliedRewards.push(reward.rewardName);
  };

  const result = await service.claimRetroactiveRewards('user_1', { fromTier: 1, toTier: 3 });

  assert.equal(result.claimedCount, 2);
  assert.deepEqual(appliedRewards, ['Tier 1', 'Tier 3']);
});

test('5.3 revenue purchase by stream grants tournament ticket entitlement', async () => {
  let grantedEntitlement = null;

  const router = loadWithMocks('../api/revenue', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': {
      isEnabled: () => true,
      query: async (sql) => {
        const text = String(sql);
        if (text.includes('SELECT id FROM users')) return { rows: [{ id: 'user_1' }] };
        return { rows: [] };
      }
    },
    '../models/data-access': {
      getSkuByKey: async () => ({
        id: 'sku_1',
        sku_key: 'sku_ticket',
        product_id: 'prod_ticket',
        unit_amount: 499,
        currency: 'USD',
        metadata: {}
      }),
      createOrder: async () => ({ id: 'ord_1' }),
      createOrderItem: async () => ({ id: 'ord_item_1' }),
      grantEntitlement: async (payload) => {
        grantedEntitlement = payload;
        return { id: 'ent_1' };
      }
    },
    '../services/paymentService': {
      recordRevenuePurchaseTransaction: async () => ({ success: true })
    },
    '../services/economyMutationService': {
      executeIdempotentMutation: async (opts) => {
        const responseBody = await opts.mutationFn();
        return { replayed: false, responseBody };
      },
      makeId: () => 'id_1'
    }
  });

  const handler = getRouteHandler(router, 'post', '/purchase');
  const req = createReq({
    body: {
      stream: 'tournament_ticket',
      skuKey: 'sku_ticket',
      quantity: 2
    },
    headers: { 'idempotency-key': 'idem-rev-ticket-1' }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(grantedEntitlement.entitlementType, 'tournament_ticket');
  assert.equal(grantedEntitlement.quantity, 2);
});

test('5.3 tournament consume prevents double spend', async () => {
  const router = loadWithMocks('../api/revenue', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': {
      isEnabled: () => true,
      query: async () => ({ rows: [] })
    },
    '../models/data-access': {
      consumeTournamentTicket: async () => ({ already_used: 1, has_ticket: 1, entitlement_id: 'ent_1' })
    },
    '../services/paymentService': {},
    '../services/economyMutationService': {
      executeIdempotentMutation: async (opts) => {
        const responseBody = await opts.mutationFn();
        return { replayed: false, responseBody };
      },
      makeId: () => 'id_1'
    }
  });

  const handler = getRouteHandler(router, 'post', '/tournament/consume');
  const req = createReq({
    body: { tournamentId: 'tournament_1' },
    headers: { 'idempotency-key': 'idem-ttc-1' }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.payload.error.code, 'TOURNAMENT_ALREADY_ENTERED');
});

test('5.3 booster activation enforces active cap', async () => {
  const router = loadWithMocks('../api/revenue', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': {
      isEnabled: () => true,
      query: async () => ({ rows: [] })
    },
    '../models/data-access': {
      getActiveEntitlementByType: async () => ({
        id: 'ent_boost_1',
        user_id: 'user_1',
        entitlement_type: 'xp_booster',
        status: 'active',
        expires_at: null,
        quantity: 1,
        consumed_quantity: 0,
        metadata: { multiplier: 1.25, durationMinutes: 60 }
      }),
      listActiveXpBoosterActivations: async () => ([{ multiplier: 1.2 }, { multiplier: 1.3 }])
    },
    '../services/paymentService': {},
    '../services/economyMutationService': {
      executeIdempotentMutation: async (opts) => {
        const responseBody = await opts.mutationFn();
        return { replayed: false, responseBody };
      },
      makeId: () => 'id_1'
    }
  });

  const handler = getRouteHandler(router, 'post', '/booster/activate');
  const req = createReq({ headers: { 'idempotency-key': 'idem-boost-cap-1' } });
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.payload.error.code, 'BOOSTER_ACTIVE_CAP_REACHED');
});

test('5.3 booster activation enforces stack cap policy', async () => {
  const router = loadWithMocks('../api/revenue', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': {
      isEnabled: () => true,
      query: async () => ({ rows: [] })
    },
    '../models/data-access': {
      getActiveEntitlementByType: async () => ({
        id: 'ent_boost_2',
        user_id: 'user_1',
        entitlement_type: 'xp_booster',
        status: 'active',
        expires_at: null,
        quantity: 1,
        consumed_quantity: 0,
        metadata: { multiplier: 1.4, durationMinutes: 60 }
      }),
      listActiveXpBoosterActivations: async () => ([{ multiplier: 1.8 }])
    },
    '../services/paymentService': {},
    '../services/economyMutationService': {
      executeIdempotentMutation: async (opts) => {
        const responseBody = await opts.mutationFn();
        return { replayed: false, responseBody };
      },
      makeId: () => 'id_1'
    }
  });

  const handler = getRouteHandler(router, 'post', '/booster/activate');
  const req = createReq({ headers: { 'idempotency-key': 'idem-boost-stack-1' } });
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.payload.error.code, 'BOOSTER_STACK_CAP_EXCEEDED');
});

test('5.3 founder edition is one-time purchase', async () => {
  const router = loadWithMocks('../api/revenue', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': {
      isEnabled: () => true,
      query: async (sql) => {
        const text = String(sql);
        if (text.includes('SELECT id FROM users')) return { rows: [{ id: 'user_1' }] };
        return { rows: [] };
      }
    },
    '../models/data-access': {
      getSkuByKey: async () => ({
        id: 'sku_founder',
        sku_key: 'sku_founder',
        product_id: 'prod_founder',
        unit_amount: 2999,
        currency: 'USD',
        metadata: {}
      }),
      createOrder: async () => ({ id: 'ord_founder_1' }),
      createOrderItem: async () => ({ id: 'ord_item_founder_1' }),
      getFounderOwnership: async () => ({ id: 'founder_owned_1' })
    },
    '../services/paymentService': {
      recordRevenuePurchaseTransaction: async () => ({ success: true })
    },
    '../services/economyMutationService': {
      executeIdempotentMutation: async (opts) => {
        const responseBody = await opts.mutationFn();
        return { replayed: false, responseBody };
      },
      makeId: () => 'id_1'
    }
  });

  const handler = getRouteHandler(router, 'post', '/purchase');
  const req = createReq({
    body: {
      stream: 'founder_edition',
      skuKey: 'sku_founder'
    },
    headers: { 'idempotency-key': 'idem-founder-1' }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.payload.error.code, 'FOUNDER_ALREADY_OWNED');
});

test('5.3 season pass coverage endpoint returns coverage', async () => {
  const router = loadWithMocks('../api/revenue', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': {
      isEnabled: () => true,
      query: async () => ({ rows: [] })
    },
    '../models/data-access': {
      getSeasonPassCoverage: async (userId, year) => ({ id: `cov_${userId}_${year}`, coverage_year: year })
    },
    '../services/paymentService': {},
    '../services/economyMutationService': {
      executeIdempotentMutation: async (opts) => {
        const responseBody = await opts.mutationFn();
        return { replayed: false, responseBody };
      },
      makeId: () => 'id_1'
    }
  });

  const handler = getRouteHandler(router, 'get', '/season-pass/coverage/:year');
  const req = createReq({ params: { year: '2026' } });
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.covered, true);
  assert.equal(res.payload.year, 2026);
});

// ===== PHASE 3: DEEP OPTIMIZATION REGRESSION TESTS =====

test('phase3 store purchase path uses reduced SQL round-trips and keeps payload semantics', async () => {
  const seenSql = [];
  let observedPerfChannel = null;

  const postgresMock = {
    isEnabled: () => true,
    query: async (sql, params = []) => {
      const text = String(sql).replace(/\s+/g, ' ').trim();
      seenSql.push(text);

      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') return { rows: [] };
      if (text.includes('FROM economy_audit_log') && text.includes('seasonal_purchase.succeeded')) {
        return { rows: [{ c: 0 }] };
      }
      if (text.includes('UPDATE seasonal_store_items') && text.includes('RETURNING id, item_key, name, price_coins')) {
        assert.equal(params[0], 'pumpkin_mask');
        assert.equal(params[1], 2);
        return { rows: [{ id: 'ssi_1', item_key: 'pumpkin_mask', name: 'Pumpkin Mask', price_coins: 100 }] };
      }
      if (text.includes('UPDATE users') && text.includes('RETURNING horror_coins')) {
        return { rows: [{ horror_coins: 800 }] };
      }
      if (text.includes('INSERT INTO entitlements')) {
        return { rows: [{ id: 'ent_1' }] };
      }

      throw new Error(`Unexpected SQL in test: ${text}`);
    }
  };

  const router = loadWithMocks('../api/store', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': postgresMock,
    '../services/economyMutationService': {
      executeIdempotentMutation: async (opts) => {
        observedPerfChannel = opts.perfChannel;
        const responseBody = await opts.mutationFn();
        return { replayed: false, responseBody };
      },
      appendAuditEvent: async () => {},
      makeId: () => 'id_1'
    }
  });

  const handler = getRouteHandler(router, 'post', '/seasonal/purchase');
  const req = createReq({
    body: { itemKey: 'pumpkin_mask', quantity: 2 },
    headers: { 'idempotency-key': 'idem-store-phase3-1' }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(observedPerfChannel, 'store.seasonal.purchase');
  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.itemKey, 'pumpkin_mask');
  assert.equal(res.payload.quantity, 2);
  assert.equal(res.payload.spentCoins, 200);
  assert.equal(res.payload.remainingCoins, 800);

  assert.equal(seenSql.some((s) => s.includes('SELECT id, horror_coins, inventory FROM users WHERE id = $1 LIMIT 1 FOR UPDATE')), false);
  assert.equal(seenSql.some((s) => s.includes('SELECT id, item_key, name, price_coins')), false);
  assert.ok(seenSql.length <= 6);
});

test('phase3 marketplace buy path preserves correctness with fewer user round-trips', async () => {
  const seenSql = [];
  let observedPerfChannel = null;

  const postgresMock = {
    isEnabled: () => true,
    query: async (sql, params = []) => {
      const text = String(sql).replace(/\s+/g, ' ').trim();
      seenSql.push(text);

      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') return { rows: [] };
      if (text.includes('FROM economy_audit_log') && text.includes('marketplace_listing_buy.succeeded')) {
        return { rows: [{ c: 0 }] };
      }
      if (text.includes('FROM marketplace_listings') && text.includes('FOR UPDATE')) {
        return {
          rows: [{
            id: 'ml_1',
            seller_user_id: 'seller_1',
            buyer_user_id: null,
            item_key: 'blade',
            price_coins: 1000,
            tax_amount: 100,
            seller_net_amount: 900,
            status: 'active'
          }]
        };
      }
      if (text.includes('UPDATE users') && text.includes('RETURNING id')) {
        if (params[0] === 'user_1') return { rows: [{ id: 'user_1' }] };
        if (params[0] === 'seller_1') return { rows: [{ id: 'seller_1' }] };
      }
      if (text.includes('UPDATE marketplace_listings') && text.includes("SET status = 'sold'")) {
        return { rows: [] };
      }

      throw new Error(`Unexpected SQL in test: ${text}`);
    }
  };

  const router = loadWithMocks('../api/marketplace', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': postgresMock,
    '../services/economyMutationService': {
      executeIdempotentMutation: async (opts) => {
        observedPerfChannel = opts.perfChannel;
        const responseBody = await opts.mutationFn();
        return { replayed: false, responseBody };
      },
      appendAuditEvent: async () => {},
      makeId: () => 'id_1'
    }
  });

  const handler = getRouteHandler(router, 'post', '/listings/:listingId/buy');
  const req = createReq({
    params: { listingId: 'ml_1' },
    headers: { 'idempotency-key': 'idem-market-phase3-buy-1' }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(observedPerfChannel, 'marketplace.listing.buy');
  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.listingId, 'ml_1');
  assert.equal(res.payload.spentCoins, 1000);
  assert.equal(res.payload.taxAmount, 100);
  assert.equal(res.payload.sellerNetAmount, 900);

  assert.equal(seenSql.some((s) => s.includes('SELECT id, horror_coins, inventory FROM users WHERE id = $1 LIMIT 1 FOR UPDATE')), false);
  assert.equal(seenSql.some((s) => s.includes('SELECT id, horror_coins FROM users WHERE id = $1 LIMIT 1 FOR UPDATE')), false);
  assert.ok(seenSql.length <= 7);
});
