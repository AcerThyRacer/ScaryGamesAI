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

function loadPaymentService({ dbMock, postgresMock, economyMock }) {
  return loadWithMocks('../services/paymentService', {
    stripe: () => ({
      checkout: { sessions: { create: async () => ({ id: 'sess_1' }) } },
      subscriptions: {
        cancel: async () => ({}),
        retrieve: async () => ({ items: { data: [{ id: 'item_1' }] } }),
        update: async () => ({})
      }
    }),
    '../models/database': dbMock,
    '../models/postgres': postgresMock,
    './economyMutationService': economyMock,
    '../models/data-access': {}
  });
}

test('achievement reward tiers map correctly and hidden achievements apply 2x multiplier', async () => {
  const users = new Map([
    ['user_1', { id: 'user_1', souls: 0, gem_dust: 0, blood_gems: 0 }]
  ]);
  const achievements = [];

  const dbMock = {
    findOne: (collection, query) => {
      if (collection !== 'achievements') return null;
      return achievements.find((a) => a.userId === query.userId && a.achievementId === query.achievementId) || null;
    },
    findById: (collection, id) => {
      if (collection !== 'users') return null;
      return users.get(id) || null;
    },
    update: (collection, id, updates) => {
      if (collection !== 'users') return null;
      const existing = users.get(id);
      if (!existing) return null;
      const next = { ...existing, ...updates };
      users.set(id, next);
      return next;
    },
    create: (collection, payload) => {
      if (collection !== 'achievements') return null;
      const created = { id: `ach_${achievements.length + 1}`, ...payload };
      achievements.push(created);
      return created;
    }
  };

  const service = loadPaymentService({
    dbMock,
    postgresMock: { isEnabled: () => false },
    economyMock: {
      appendAuditEvent: async () => {},
      executeIdempotentMutation: async () => {
        throw new Error('should not be called in non-PG mode');
      },
      makeId: () => 'id_1'
    }
  });

  const tierCases = [
    { id: 'ach_bronze', meta: { tier: 'bronze' }, expected: { souls: 100, gemDust: 5, bloodGems: 0 } },
    { id: 'ach_silver', meta: { tier: 'silver' }, expected: { souls: 500, gemDust: 15, bloodGems: 0 } },
    { id: 'ach_gold', meta: { tier: 'gold' }, expected: { souls: 2000, gemDust: 0, bloodGems: 50 } },
    { id: 'ach_platinum', meta: { tier: 'platinum' }, expected: { souls: 10000, gemDust: 0, bloodGems: 200 } },
    { id: 'ach_hidden_gold', meta: { tier: 'gold', hidden: true }, expected: { souls: 4000, gemDust: 0, bloodGems: 100 } }
  ];

  let running = { souls: 0, gemDust: 0, bloodGems: 0 };

  for (const item of tierCases) {
    const result = await service.unlockAchievement('user_1', item.id, item.meta);
    assert.equal(result.unlocked, true);
    assert.equal(result.alreadyUnlocked, false);
    assert.deepEqual(result.reward, item.expected);

    running = {
      souls: running.souls + item.expected.souls,
      gemDust: running.gemDust + item.expected.gemDust,
      bloodGems: running.bloodGems + item.expected.bloodGems
    };
  }

  const user = users.get('user_1');
  assert.equal(user.souls, running.souls);
  assert.equal(user.gem_dust, running.gemDust);
  assert.equal(user.blood_gems, running.bloodGems);

  const duplicate = await service.unlockAchievement('user_1', 'ach_hidden_gold', { tier: 'gold', hidden: true });
  assert.equal(duplicate.unlocked, false);
  assert.equal(duplicate.alreadyUnlocked, true);
  assert.deepEqual(duplicate.reward, { souls: 0, gemDust: 0, bloodGems: 0 });
  assert.equal(users.get('user_1').souls, running.souls);
  assert.equal(users.get('user_1').gem_dust, running.gemDust);
  assert.equal(users.get('user_1').blood_gems, running.bloodGems);
});

test('unlockAchievement uses idempotent PG mutation flow and writes tier/hidden metadata', async () => {
  const calls = {
    insertParams: null,
    updateParams: null,
    idempotentOpts: null,
    audit: null
  };

  const postgresMock = {
    isEnabled: () => true,
    query: async (sql, params = []) => {
      const text = String(sql).replace(/\s+/g, ' ').trim();

      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') return { rows: [] };
      if (text.includes('SELECT id, souls, blood_gems, gem_dust FROM users')) {
        return { rows: [{ id: 'user_1', souls: 10, blood_gems: 2, gem_dust: 1 }] };
      }
      if (text.includes('FROM achievements') && text.includes('WHERE user_id = $1 AND achievement_id = $2')) {
        return { rows: [] };
      }
      if (text.includes('INSERT INTO achievements')) {
        calls.insertParams = params;
        return { rows: [] };
      }
      if (text.includes('UPDATE users') && text.includes('SET souls = $2')) {
        calls.updateParams = params;
        return { rows: [] };
      }

      throw new Error(`Unexpected SQL in test: ${text}`);
    }
  };

  const service = loadPaymentService({
    dbMock: {},
    postgresMock,
    economyMock: {
      appendAuditEvent: async (payload) => {
        calls.audit = payload;
      },
      executeIdempotentMutation: async (opts) => {
        calls.idempotentOpts = opts;
        const responseBody = await opts.mutationFn();
        return { replayed: false, responseBody };
      },
      makeId: () => 'made_id'
    }
  });

  const result = await service.unlockAchievement('user_1', 'first_blood');

  assert.equal(calls.idempotentOpts.scope, 'achievement.unlock');
  assert.equal(calls.idempotentOpts.idempotencyKey, 'achievement_unlock:user_1:first_blood');
  assert.equal(calls.idempotentOpts.perfChannel, 'achievement.unlock');

  assert.ok(Array.isArray(calls.insertParams));
  assert.equal(calls.insertParams[1], 'user_1');
  assert.equal(calls.insertParams[2], 'first_blood');
  assert.equal(calls.insertParams[3], 'bronze');
  assert.equal(calls.insertParams[4], false);

  assert.deepEqual(calls.updateParams, ['user_1', 110, 6, 2]);

  assert.equal(calls.audit.metadata.reason, 'achievement_unlock');
  assert.equal(calls.audit.metadata.tier, 'bronze');
  assert.equal(calls.audit.metadata.hidden, false);
  assert.equal(calls.audit.metadata.souls, 100);
  assert.equal(calls.audit.metadata.gemDust, 5);
  assert.equal(calls.audit.metadata.bloodGems, 0);

  assert.equal(result.unlocked, true);
  assert.equal(result.alreadyUnlocked, false);
  assert.deepEqual(result.reward, { souls: 100, gemDust: 5, bloodGems: 0 });
});

test('unlockAchievement does not grant duplicate rewards in PG mode', async () => {
  let updateCalled = false;
  let insertCalled = false;

  const postgresMock = {
    isEnabled: () => true,
    query: async (sql) => {
      const text = String(sql).replace(/\s+/g, ' ').trim();

      if (text === 'BEGIN' || text === 'COMMIT' || text === 'ROLLBACK') return { rows: [] };
      if (text.includes('SELECT id, souls, blood_gems, gem_dust FROM users')) {
        return { rows: [{ id: 'user_1', souls: 333, blood_gems: 7, gem_dust: 12 }] };
      }
      if (text.includes('FROM achievements') && text.includes('WHERE user_id = $1 AND achievement_id = $2')) {
        return { rows: [{ id: 'ach_existing', user_id: 'user_1', achievement_id: 'already_done' }] };
      }
      if (text.includes('INSERT INTO achievements')) {
        insertCalled = true;
        throw new Error('INSERT should not happen for duplicates');
      }
      if (text.includes('UPDATE users') && text.includes('SET souls = $2')) {
        updateCalled = true;
        throw new Error('UPDATE users should not happen for duplicates');
      }

      throw new Error(`Unexpected SQL in test: ${text}`);
    }
  };

  const service = loadPaymentService({
    dbMock: {},
    postgresMock,
    economyMock: {
      appendAuditEvent: async () => {},
      executeIdempotentMutation: async (opts) => {
        const responseBody = await opts.mutationFn();
        return { replayed: false, responseBody };
      },
      makeId: () => 'id_1'
    }
  });

  const result = await service.unlockAchievement('user_1', 'already_done', { tier: 'platinum', hidden: true });

  assert.equal(insertCalled, false);
  assert.equal(updateCalled, false);
  assert.equal(result.unlocked, false);
  assert.equal(result.alreadyUnlocked, true);
  assert.deepEqual(result.reward, { souls: 0, gemDust: 0, bloodGems: 0 });
  assert.equal(result.rewardMeta.tier, 'platinum');
  assert.equal(result.rewardMeta.hidden, true);
  assert.equal(result.rewardMeta.multiplier, 2);
  assert.deepEqual(result.balances, { souls: 333, gemDust: 12, bloodGems: 7 });
});
