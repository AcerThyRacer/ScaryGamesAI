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

test('phase6 extras: observability structured security logs redact sensitive fields', () => {
  const prevEnabled = process.env.OBS_STRUCTURED_LOGS_ENABLED;
  const prevRate = process.env.OBS_SECURITY_SAMPLE_RATE;

  process.env.OBS_STRUCTURED_LOGS_ENABLED = 'true';
  process.env.OBS_SECURITY_SAMPLE_RATE = '1';

  const originalConsoleLog = console.log;
  const captured = [];
  console.log = (line) => captured.push(line);

  delete require.cache[require.resolve('../services/observability')];
  const observability = require('../services/observability');

  observability.recordSecurityEvent('auth.middleware.denied', {
    userId: 'user-123',
    ipAddress: '203.0.113.5',
    token: 'secret-token-value',
    email: 'user@example.com'
  }, { force: true });

  console.log = originalConsoleLog;
  process.env.OBS_STRUCTURED_LOGS_ENABLED = prevEnabled;
  process.env.OBS_SECURITY_SAMPLE_RATE = prevRate;

  assert.ok(captured.length >= 1);

  const payload = JSON.parse(captured[0]);
  assert.equal(payload.kind, 'security');
  assert.equal(payload.event, 'auth.middleware.denied');
  assert.equal(payload.fields.token, '[redacted]');
  assert.equal(payload.fields.email, '[redacted]');
  assert.notEqual(payload.fields.userId, 'user-123');
  assert.equal(String(payload.fields.userId).length, 16);
  assert.notEqual(payload.fields.ipAddress, '203.0.113.5');
});

test('phase6 extras: rate limiter emits guard event when threshold exceeded', async () => {
  const securityEvents = [];
  const perfEvents = [];

  const { createRateLimiter } = loadWithMocks('../middleware/rateLimit', {
    '../services/cacheService': {
      increment: async () => 9
    },
    '../services/observability': {
      recordSecurityEvent: (...args) => securityEvents.push(args),
      recordPerfEvent: (...args) => perfEvents.push(args)
    }
  });

  const middleware = createRateLimiter({
    scope: 'api-v2',
    limit: 5,
    windowSeconds: 60,
    includeUser: true
  });

  const req = {
    headers: {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    baseUrl: '/api/v2',
    path: '/auth/login',
    method: 'POST',
    user: { id: 'u_rate' }
  };

  const res = {
    statusCode: 200,
    payload: null,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    }
  };

  await middleware(req, res, () => {});

  assert.equal(res.statusCode, 429);
  assert.equal(res.payload?.error?.code, 'RATE_LIMIT_EXCEEDED');
  assert.equal(securityEvents.length, 1);
  assert.equal(securityEvents[0][0], 'rate_limit.exceeded');
  assert.ok(perfEvents.length >= 1);
});

test('phase6 extras: runtime guardrail evaluator flags missing controls', () => {
  const guardrails = require('../scripts/check-runtime-guardrails');

  const failures = guardrails.evaluateGuardrails({
    packageJson: { scripts: { lint: 'node scripts/lint-basic.js' } },
    ciWorkflow: 'name: ci\nsteps:\n  - run: npm run lint\n',
    observabilitySource: 'module.exports = {}',
    authMiddlewareSource: 'function authMiddleware() {}',
    rateLimitSource: 'function createRateLimiter() {}'
  });

  assert.ok(failures.some((line) => line.includes('Missing npm script: ci:guardrails')));
  assert.ok(failures.some((line) => line.includes('Workflow missing runtime guardrail stage')));
  assert.ok(failures.some((line) => line.includes('services/observability.js must expose')));
});
