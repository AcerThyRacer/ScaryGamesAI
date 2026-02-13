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
  return (req, _res, next) => next();
}

function createReq({ body = {}, params = {}, headers = {}, userId = 'user_1' } = {}) {
  const normalizedHeaders = {};
  for (const [k, v] of Object.entries(headers)) {
    normalizedHeaders[k.toLowerCase()] = v;
  }

  return {
    body,
    params,
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

function normalizeSql(sql) {
  return String(sql).replace(/\s+/g, ' ').trim();
}

function createMutationMock() {
  return {
    executeIdempotentMutation: async (opts) => {
      const responseBody = await opts.mutationFn();
      return { replayed: false, responseBody };
    },
    appendAuditEvent: async () => {},
    makeId: () => 'id_1'
  };
}

test('daily quest completion grants configured souls reward and keeps legacy fields', async () => {
  const postgresMock = {
    isEnabled: () => true,
    query: async (sql, params = []) => {
      const text = normalizeSql(sql);

      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') return { rows: [] };
      if (text.includes('INSERT INTO community_goal_progress')) return { rows: [] };
      if (text.includes('SELECT id, COALESCE(horror_coins, 0) AS horror_coins') && text.includes('FOR UPDATE')) {
        return {
          rows: [{
            id: 'user_1',
            horror_coins: 1000,
            gem_dust: 10,
            blood_gems: 5,
            inventory: []
          }]
        };
      }
      if (text.includes('INSERT INTO daily_activity_progress')) {
        return { rows: [{ id: 'dquest_1' }] };
      }
      if (text.includes('SELECT target_value, current_value, reward_multiplier') && text.includes('community_goal_progress')) {
        return { rows: [{ target_value: 1, current_value: 0, reward_multiplier: 2 }] };
      }
      if (text.includes('UPDATE users') && text.includes('SET horror_coins = $2')) {
        assert.equal(params[1], 1200);
        assert.equal(params[2], 10);
        assert.equal(params[3], 5);
        return { rows: [] };
      }
      if (text.includes("SELECT date_trunc('week'")) {
        return { rows: [{ week_start: '2026-02-09' }] };
      }
      if (text.includes('FROM daily_activity_progress') && text.includes('activity_date >= $2::date')) {
        return { rows: [{ c: 5 }] };
      }
      if (text.includes('FROM daily_activity_progress') && text.includes('activity_date = CURRENT_DATE')) {
        return { rows: [{ c: 1 }] };
      }

      throw new Error(`Unexpected SQL in test: ${text}`);
    }
  };

  const router = loadWithMocks('../api/daily-activity', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': postgresMock,
    '../services/economyMutationService': createMutationMock()
  });

  const handler = getRouteHandler(router, 'post', '/activities/:activityCode/complete');
  const req = createReq({
    params: { activityCode: 'survive_5_rounds' },
    headers: { 'idempotency-key': 'idem-daily-quest-1' }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.activityCode, 'survive_5_rounds');
  assert.equal(res.payload.rewardGranted.souls, 200);
  assert.equal(res.payload.rewardGranted.gemDust, 0);
  assert.equal(res.payload.activityRewardGranted, 0);
  assert.equal(res.payload.allCompleteBonusGranted, 0);
  assert.equal(res.payload.balances.souls, 1200);
});

test('weekly quest completion enforces complete_20_daily_quests requirement', async () => {
  const postgresMock = {
    isEnabled: () => true,
    query: async (sql) => {
      const text = normalizeSql(sql);

      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') return { rows: [] };
      if (text.includes('INSERT INTO community_goal_progress')) return { rows: [] };
      if (text.includes('SELECT id, COALESCE(blood_gems, 0) AS blood_gems') && text.includes('FOR UPDATE')) {
        return { rows: [{ id: 'user_1', blood_gems: 100 }] };
      }
      if (text.includes("SELECT date_trunc('week'")) {
        return { rows: [{ week_start: '2026-02-09' }] };
      }
      if (text.includes('FROM weekly_quest_completions') && text.includes('quest_code = $3')) {
        return { rows: [] };
      }
      if (text.includes('FROM daily_activity_progress') && text.includes('activity_date >= $2::date')) {
        return { rows: [{ c: 12 }] };
      }

      throw new Error(`Unexpected SQL in test: ${text}`);
    }
  };

  const router = loadWithMocks('../api/daily-activity', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': postgresMock,
    '../services/economyMutationService': createMutationMock()
  });

  const handler = getRouteHandler(router, 'post', '/weekly-quests/:questCode/complete');
  const req = createReq({
    params: { questCode: 'complete_20_daily_quests' },
    headers: { 'idempotency-key': 'idem-weekly-quest-1' }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.error.code, 'WEEKLY_QUEST_REQUIREMENT_NOT_MET');
});

test('season quest claim grants gems and exclusive skin when threshold reached', async () => {
  const postgresMock = {
    isEnabled: () => true,
    query: async (sql, params = []) => {
      const text = normalizeSql(sql);

      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') return { rows: [] };
      if (text.includes('INSERT INTO community_goal_progress')) return { rows: [] };
      if (text.includes('SELECT id, COALESCE(blood_gems, 0) AS blood_gems') && text.includes('FROM users') && text.includes('FOR UPDATE')) {
        return { rows: [{ id: 'user_1', blood_gems: 100, inventory: [] }] };
      }
      if (text.includes('SELECT completed_count, reward_claimed') && text.includes('FROM season_quest_progress') && text.includes('FOR UPDATE')) {
        return { rows: [{ completed_count: 15, reward_claimed: false }] };
      }
      if (text.includes('SELECT target_value, current_value, reward_multiplier') && text.includes('community_goal_progress')) {
        return { rows: [{ target_value: 1, current_value: 0, reward_multiplier: 2 }] };
      }
      if (text.includes('UPDATE users') && text.includes('SET blood_gems = $2') && text.includes('inventory = $3::jsonb')) {
        assert.equal(params[1], 5100);
        return { rows: [] };
      }
      if (text.includes('UPDATE season_quest_progress') && text.includes('SET reward_claimed = TRUE')) {
        return { rows: [] };
      }

      throw new Error(`Unexpected SQL in test: ${text}`);
    }
  };

  const router = loadWithMocks('../api/daily-activity', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': postgresMock,
    '../services/economyMutationService': createMutationMock()
  });

  const handler = getRouteHandler(router, 'post', '/season-quests/claim');
  const req = createReq({
    headers: { 'idempotency-key': 'idem-season-claim-1' }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.gemsAwarded, 5000);
  assert.equal(res.payload.exclusiveSkin, 'skin_season_conqueror_exclusive');
  assert.equal(res.payload.gemsBalance, 5100);
});

test('tournament claim grants top_10 rewards including rare chest', async () => {
  const postgresMock = {
    isEnabled: () => true,
    query: async (sql, params = []) => {
      const text = normalizeSql(sql);

      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') return { rows: [] };
      if (text.includes('INSERT INTO community_goal_progress')) return { rows: [] };
      if (text.includes('SELECT id, COALESCE(horror_coins, 0) AS horror_coins') && text.includes('FOR UPDATE')) {
        return { rows: [{ id: 'user_1', horror_coins: 100, blood_gems: 20, inventory: [] }] };
      }
      if (text.includes('INSERT INTO tournament_participation_rewards') && text.includes('RETURNING id')) {
        return { rows: [{ id: 'tourrw_1' }] };
      }
      if (text.includes('SELECT target_value, current_value, reward_multiplier') && text.includes('community_goal_progress')) {
        return { rows: [{ target_value: 1, current_value: 0, reward_multiplier: 2 }] };
      }
      if (text.includes('UPDATE users') && text.includes('SET horror_coins = $2')) {
        assert.equal(params[1], 5100);
        assert.equal(params[2], 220);
        return { rows: [] };
      }
      if (text.includes('UPDATE tournament_participation_rewards') && text.includes('SET souls_awarded = $3')) {
        return { rows: [] };
      }

      throw new Error(`Unexpected SQL in test: ${text}`);
    }
  };

  const router = loadWithMocks('../api/daily-activity', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': postgresMock,
    '../services/economyMutationService': createMutationMock()
  });

  const handler = getRouteHandler(router, 'post', '/tournament/claim');
  const req = createReq({
    body: { tournamentId: 'tournament_1', tier: 'top_10' },
    headers: { 'idempotency-key': 'idem-tournament-1' }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.soulsAwarded, 5000);
  assert.equal(res.payload.gemsAwarded, 200);
  assert.equal(res.payload.rewardItems[0].itemType, 'rare_chest');
});

test('community goal claim blocks claim before goal achievement', async () => {
  const postgresMock = {
    isEnabled: () => true,
    query: async (sql) => {
      const text = normalizeSql(sql);

      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') return { rows: [] };
      if (text.includes('INSERT INTO community_goal_progress')) return { rows: [] };
      if (text.includes('SELECT goal_code, target_value, current_value, reward_gems') && text.includes('FOR UPDATE')) {
        return { rows: [{ goal_code: 'games_played_1000000', target_value: 1000000, current_value: 42, reward_gems: 100 }] };
      }

      throw new Error(`Unexpected SQL in test: ${text}`);
    }
  };

  const router = loadWithMocks('../api/daily-activity', {
    '../middleware/auth': createAuthMock(),
    '../models/postgres': postgresMock,
    '../services/economyMutationService': createMutationMock()
  });

  const handler = getRouteHandler(router, 'post', '/community-goals/:goalCode/claim');
  const req = createReq({
    params: { goalCode: 'games_played_1000000' },
    headers: { 'idempotency-key': 'idem-community-claim-1' }
  });
  const res = createRes();

  await handler(req, res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.payload.success, false);
  assert.equal(res.payload.error.code, 'COMMUNITY_GOAL_NOT_ACHIEVED');
});
