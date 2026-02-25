// Cloudflare Worker entry point
// Static assets from ./dist are served automatically via [assets] config.
// This worker handles requests that don't match static assets.

const FALLBACK_API_ORIGIN = 'https://scarygames.ai';

function normalizeOrigin(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function resolveApiOrigin(env, requestUrl) {
  const explicitOrigin = normalizeOrigin(env?.API_ORIGIN || env?.BACKEND_ORIGIN || '');
  if (explicitOrigin) return explicitOrigin;

  const host = requestUrl.hostname.toLowerCase();
  if (host === 'scarygaming.com' || host === 'www.scarygaming.com') {
    return FALLBACK_API_ORIGIN;
  }
  return null;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function jsonError(status, code, message) {
  return jsonResponse({ success: false, error: { code, message } }, status);
}

// Mock subscription data store (in-memory per request - use KV for persistence)
const mockSubscriptions = new Map();
const mockBattlePass = new Map();
const mockUsers = new Map();

// Subscription API handlers
const subscriptionHandlers = {
  // GET /api/subscriptions/status
  async getStatus(request) {
    const userId = getUserId(request);
    const sub = mockSubscriptions.get(userId);

    if (!sub || sub.status !== 'active') {
      return jsonResponse({
        hasSubscription: false,
        tier: null
      });
    }

    const expiresAt = new Date(sub.expiresAt);
    const daysRemaining = Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24));

    return jsonResponse({
      hasSubscription: true,
      tier: sub.tier,
      billingCycle: sub.billingCycle,
      startedAt: sub.startedAt,
      expiresAt: sub.expiresAt,
      daysRemaining: Math.max(0, daysRemaining),
      streakDays: sub.streakDays || 0,
      totalDays: sub.totalDays || 0,
      autoRenew: sub.status === 'active'
    });
  },

  // POST /api/subscriptions/create-checkout
  async createCheckout(request) {
    const userId = getUserId(request);
    const body = await request.json().catch(() => ({}));
    const { tier, billingCycle } = body;

    if (!tier || !['survivor', 'hunter', 'elder'].includes(tier)) {
      return jsonError(400, 'INVALID_TIER', 'Invalid subscription tier');
    }

    // Return mock checkout URL
    return jsonResponse({
      success: true,
      sessionId: `mock_session_${Date.now()}`,
      url: `/subscription-success?mock=true&tier=${tier}&cycle=${billingCycle}`,
      message: 'Mock checkout - no payment processed'
    });
  },

  // GET /api/subscriptions/battle-pass
  async getBattlePass(request) {
    const userId = getUserId(request);
    let bp = mockBattlePass.get(userId);

    if (!bp) {
      bp = {
        userId,
        level: 1,
        xp: 0,
        progress: 0,
        streakDays: 0,
        nextReward: { name: '100 Souls', type: 'currency' }
      };
      mockBattlePass.set(userId, bp);
    }

    return jsonResponse(bp);
  },

  // GET /api/subscriptions/battle-pass/v2
  async getBattlePassV2(request) {
    const userId = getUserId(request);
    const seasonKey = new URL(request.url).searchParams.get('seasonKey') || 'season-1';

    return jsonResponse({
      success: true,
      state: {
        currentTier: 1,
        currentXp: 0,
        nextTierXp: 1000,
        loginStreak: 0,
        nextReward: { name: '100 Souls', type: 'currency' }
      },
      season: {
        id: 'season-1',
        name: 'Season of Shadows',
        key: seasonKey
      }
    });
  },

  // POST /api/subscriptions/battle-pass/v2/events
  async postBattlePassEvent(request) {
    const userId = getUserId(request);
    const body = await request.json().catch(() => ({}));

    return jsonResponse({
      success: true,
      xpGranted: body.eventValue || 1,
      newTotalXp: 100,
      tiersUnlocked: [],
      message: 'Mock event accepted'
    });
  },

  // POST /api/subscriptions/battle-pass/v2/claim-tier
  async claimBattlePassTier(request) {
    return jsonResponse({
      success: true,
      message: 'Tier claimed (mock)'
    });
  },

  // POST /api/subscriptions/battle-pass/v2/claim-retroactive
  async claimRetroactive(request) {
    return jsonResponse({
      success: true,
      claimed: [],
      message: 'Retroactive claim processed (mock)'
    });
  },

  // POST /api/subscriptions/daily-login
  async dailyLogin(request) {
    const userId = getUserId(request);
    let bp = mockBattlePass.get(userId);

    if (!bp) {
      bp = { userId, level: 1, xp: 0, streakDays: 0 };
    }

    bp.xp += 50;
    bp.streakDays += 1;
    mockBattlePass.set(userId, bp);

    return jsonResponse({
      success: true,
      xpGained: 50,
      streak: bp.streakDays,
      nextMilestone: '7 days'
    });
  },

  // GET /api/subscriptions/pricing
  async getPricing(request) {
    return jsonResponse({
      prices: {
        survivor: { monthly: 2, annual: 20, originalMonthly: 2, originalAnnual: 20 },
        hunter: { monthly: 5, annual: 50, originalMonthly: 5, originalAnnual: 50 },
        elder: { monthly: 8, annual: 80, originalMonthly: 8, originalAnnual: 80 }
      },
      discount: 0,
      discountReason: null
    });
  },

  // GET /api/subscriptions/profile
  async getProfile(request) {
    return jsonResponse({
      horrorTolerance: { score: 0.5, level: 'Moderate' },
      playerArchetype: {
        name: 'The Methodical Survivor',
        traits: ['Cautious', 'Strategic', 'Prepared']
      },
      recommendedTier: 'hunter',
      fearProfile: {
        jumpScareTolerance: 0.6,
        atmosphericPreference: 0.8
      },
      recommendedNextGame: {
        game: 'backrooms-pacman',
        reason: 'Based on your preference for atmospheric horror'
      }
    });
  },

  // GET /api/subscriptions/community-goals
  async getCommunityGoals(request) {
    return jsonResponse([
      { target: 1000, current: 150, progress: 15, reward: 'New Horror Theme', description: 'Unlock the Blood Moon theme', isUnlocked: false },
      { target: 5000, current: 150, progress: 3, reward: 'Exclusive Mini-Game', description: 'Unlock Secret Laboratory', isUnlocked: false },
      { target: 10000, current: 150, progress: 1.5, reward: 'Community Boss', description: 'Vote on a community boss', isUnlocked: false }
    ]);
  },

  // GET /api/subscriptions/leaderboard
  async getLeaderboard(request) {
    return jsonResponse([
      { username: 'VoidWalker', tier: 'elder', streakDays: 45, totalDays: 120, isEternal: true },
      { username: 'NightCrawler', tier: 'hunter', streakDays: 23, totalDays: 67 },
      { username: 'DarkSoul99', tier: 'hunter', streakDays: 18, totalDays: 45 },
      { username: 'GhostHunter', tier: 'survivor', streakDays: 12, totalDays: 30 },
      { username: 'ShadowStep', tier: 'survivor', streakDays: 8, totalDays: 22 }
    ]);
  },

  // POST /api/subscriptions/gift
  async giftSubscription(request) {
    return jsonResponse({
      success: true,
      giftId: `gift_${Date.now()}`,
      message: 'Gift sent (mock)'
    });
  },

  // POST /api/subscriptions/cancel
  async cancelSubscription(request) {
    const userId = getUserId(request);
    const sub = mockSubscriptions.get(userId);
    if (sub) {
      sub.status = 'canceled';
      mockSubscriptions.set(userId, sub);
    }
    return jsonResponse({ success: true });
  }
};

function getUserId(request) {
  // Extract from Authorization header or return demo user
  const auth = request.headers.get('Authorization') || '';
  const match = auth.match(/Bearer\s+(.+)/);
  if (match && match[1] !== 'demo-token') {
    return `user_${match[1].slice(0, 8)}`;
  }
  return 'demo-user';
}

function getHandler(pathname, method) {
  // Map paths to handlers
  const routes = [
    { path: '/api/subscriptions/status', methods: ['GET'], handler: subscriptionHandlers.getStatus },
    { path: '/api/subscriptions/create-checkout', methods: ['POST'], handler: subscriptionHandlers.createCheckout },
    { path: '/api/subscriptions/battle-pass', methods: ['GET'], handler: subscriptionHandlers.getBattlePass },
    { path: '/api/subscriptions/battle-pass/v2', methods: ['GET'], handler: subscriptionHandlers.getBattlePassV2 },
    { path: '/api/subscriptions/battle-pass/v2/events', methods: ['POST'], handler: subscriptionHandlers.postBattlePassEvent },
    { path: '/api/subscriptions/battle-pass/v2/claim-tier', methods: ['POST'], handler: subscriptionHandlers.claimBattlePassTier },
    { path: '/api/subscriptions/battle-pass/v2/claim-retroactive', methods: ['POST'], handler: subscriptionHandlers.claimRetroactive },
    { path: '/api/subscriptions/daily-login', methods: ['POST'], handler: subscriptionHandlers.dailyLogin },
    { path: '/api/subscriptions/pricing', methods: ['GET'], handler: subscriptionHandlers.getPricing },
    { path: '/api/subscriptions/profile', methods: ['GET'], handler: subscriptionHandlers.getProfile },
    { path: '/api/subscriptions/community-goals', methods: ['GET'], handler: subscriptionHandlers.getCommunityGoals },
    { path: '/api/subscriptions/leaderboard', methods: ['GET'], handler: subscriptionHandlers.getLeaderboard },
    { path: '/api/subscriptions/gift', methods: ['POST'], handler: subscriptionHandlers.giftSubscription },
    { path: '/api/subscriptions/cancel', methods: ['POST'], handler: subscriptionHandlers.cancelSubscription }
  ];

  const route = routes.find(r => r.path === pathname && r.methods.includes(method));
  return route?.handler || null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      // First try to handle with local mock handlers
      const localHandler = getHandler(url.pathname, request.method);

      if (localHandler) {
        try {
          return await localHandler(request);
        } catch (error) {
          console.error('[worker] Mock handler error:', error);
          return jsonError(500, 'INTERNAL_ERROR', error.message);
        }
      }

      // For non-subscription routes, try to proxy to backend
      const apiOrigin = resolveApiOrigin(env, url);

      if (!apiOrigin || apiOrigin === url.origin) {
        return jsonError(503, 'API_ORIGIN_NOT_CONFIGURED', 'API backend is not configured and no mock handler exists for this endpoint.');
      }

      const targetUrl = `${apiOrigin}${url.pathname}${url.search}`;
      const proxyRequest = new Request(targetUrl, request);
      proxyRequest.headers.set('x-forwarded-host', url.host);
      proxyRequest.headers.set('x-forwarded-proto', url.protocol.replace(':', ''));

      try {
        const upstream = await fetch(proxyRequest);

        if (upstream.status === 530) {
          return jsonError(502, 'API_UPSTREAM_530', 'API backend is unreachable. Subscription features use mock data.');
        }

        return new Response(upstream.body, {
          status: upstream.status,
          statusText: upstream.statusText,
          headers: upstream.headers
        });
      } catch {
        return jsonError(502, 'API_UPSTREAM_UNREACHABLE', 'API backend is unreachable. Subscription features use mock data.');
      }
    }

    return new Response('Not Found', { status: 404 });
  }
};
