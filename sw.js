const SW_VERSION = 'sgai-v2';
const PRECACHE_CACHE = `${SW_VERSION}-precache`;
const RUNTIME_STATIC_CACHE = `${SW_VERSION}-runtime-static`;
const RUNTIME_API_CACHE = `${SW_VERSION}-runtime-api`;
const RUNTIME_PAGE_CACHE = `${SW_VERSION}-runtime-pages`;

const NETWORK_TIMEOUT_MS = 2500;
const API_PATH_PREFIX = '/api/';
const ASSET_CACHE_RE = /\.(?:js|css|woff2?|ttf|otf|png|jpe?g|gif|svg|webp|avif|ico|mp3|wav|ogg|mp4|webm)$/i;
const API_CACHE_ALLOWLIST = new Set([
  '/api/health'
]);

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/games.html',
  '/challenges.html',
  '/achievements.html',
  '/leaderboards.html',
  '/store.html',
  '/subscription.html',
  '/manifest.json',
  '/css/styles.css',
  '/css/base.css',
  '/css/components.css',
  '/css/pages.css',
  '/css/utilities.css',
  '/css/store.css',
  '/css/challenges.css',
  '/css/game-responsive.css',
  '/css/mobile-controls.css',
  '/js/page-shell.js',
  '/js/perf-entry.js',
  '/js/main.js',
  '/js/visual-enhancements.js',
  '/js/audio-enhanced.js',
  '/js/ai-system.js'
];

// Cache size limits
const MAX_RUNTIME_CACHE_ENTRIES = 100;
const MAX_RUNTIME_CACHE_SIZE_MB = 50;

function shouldCacheResponse(response) {
  return response && response.ok && (response.type === 'basic' || response.type === 'cors');
}

// Prune cache to prevent memory bloat
async function pruneCache(cacheName, maxEntries = MAX_RUNTIME_CACHE_ENTRIES) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxEntries) {
    // Remove oldest entries (first in, first out)
    const entriesToRemove = keys.slice(0, keys.length - maxEntries);
    for (const request of entriesToRemove) {
      await cache.delete(request);
    }
  }
}

async function fromNetworkWithTimeout(request, timeoutMs) {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('NETWORK_TIMEOUT')), timeoutMs);
  });

  return Promise.race([fetch(request), timeout]);
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (shouldCacheResponse(response)) {
        cache.put(request, response.clone());
        // Prune cache periodically to prevent bloat
        eventWaitUntilSafe(pruneCache(cacheName));
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    eventWaitUntilSafe(networkPromise);
    return cached;
  }

  const network = await networkPromise;
  if (network) return network;

  return new Response('Offline', { status: 503, statusText: 'Offline' });
}

async function networkFirst(request, cacheName, fallbackUrl = null) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fromNetworkWithTimeout(request, NETWORK_TIMEOUT_MS);
    if (shouldCacheResponse(response)) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (_) {
    const cached = await cache.match(request);
    if (cached) return cached;

    if (fallbackUrl) {
      const fallback = await caches.match(fallbackUrl);
      if (fallback) return fallback;
    }

    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

function eventWaitUntilSafe(promise) {
  promise.catch(() => {
    // Ignore background update errors
  });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const activeCaches = new Set([
    PRECACHE_CACHE,
    RUNTIME_STATIC_CACHE,
    RUNTIME_API_CACHE,
    RUNTIME_PAGE_CACHE
  ]);

  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('sgai-') && !activeCaches.has(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, RUNTIME_PAGE_CACHE, '/index.html'));
    return;
  }

  if (isSameOrigin && url.pathname.startsWith(API_PATH_PREFIX)) {
    if (API_CACHE_ALLOWLIST.has(url.pathname)) {
      event.respondWith(networkFirst(request, RUNTIME_API_CACHE));
      return;
    }

    event.respondWith(fetch(request));
    return;
  }

  if (isSameOrigin && ASSET_CACHE_RE.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_STATIC_CACHE));
    return;
  }

  if (isSameOrigin) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_STATIC_CACHE));
  }
});
