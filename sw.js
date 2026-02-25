// Bump on behavior/asset changes to force clients off old cached JS/video URLs.
const SW_VERSION = 'sgai-v4-phase9';
const PRECACHE_CACHE = `${SW_VERSION}-precache`;
const RUNTIME_STATIC_CACHE = `${SW_VERSION}-runtime-static`;
const RUNTIME_API_CACHE = `${SW_VERSION}-runtime-api`;
const RUNTIME_PAGE_CACHE = `${SW_VERSION}-runtime-pages`;
const GAME_SAVE_CACHE = `${SW_VERSION}-game-saves`;

const NETWORK_TIMEOUT_MS = 2500;
const API_PATH_PREFIX = '/api/';
const ASSET_CACHE_RE = /\.(?:js|css|woff2?|ttf|otf|png|jpe?g|gif|svg|webp|avif|ico|mp3|wav|ogg|mp4|webm)$/i;
const API_CACHE_ALLOWLIST = new Set([
 '/api/health',
 '/api/saves'
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
 '/ollama-builder.html',
 '/custom-games.html',
 '/oauth/callback.html',
 '/manifest.json',
 '/games/backrooms-pacman/backrooms-pacman.html',
 '/games/backrooms-pacman/backrooms-pacman.js',
 '/games/backrooms-pacman/lod-system.js',
 '/games/backrooms-pacman/webgpu-migration.js',
 '/games/backrooms-pacman/cross-platform-save.js',
 '/css/styles.css',
 '/css/base.css',
 '/css/components.css',
 '/css/auth-ui.css',
 '/css/pages.css',
 '/css/utilities.css',
 '/css/store.css',
 '/css/challenges.css',
 '/css/game-responsive.css',
 '/css/mobile-controls.css',
 '/css/ollama-builder.css',
 '/js/page-shell.js',
 '/js/auth-ui.js',
 '/js/main.js',
 '/js/state-bus.js',
 '/js/sgai-components.js',
 '/js/visual-enhancements.js',
 '/js/audio-enhanced.js',
 '/js/ai-system.js',
 '/js/ollama-integration.js',
 '/js/ollama-worker.js',
 '/js/ollama-db.js',
 '/js/ollama-share.js',
 '/js/ollama-community.js',
 '/js/ollama-collab.js',
 '/js/subscription-system.js',
];

// Cache size limits
const MAX_RUNTIME_CACHE_ENTRIES = 100;
const MAX_RUNTIME_CACHE_SIZE_MB = 50;

function shouldCacheResponse(response) {
  return response && response.ok && response.status !== 206 && (response.type === 'basic' || response.type === 'cors');
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

async function staleWhileRevalidate(event, request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (shouldCacheResponse(response)) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

if (cached) {
		// Keep SW alive while we update the cache in the background.
		// FIX: Handle promise rejection to prevent unhandled rejection
		if (networkPromise) {
			event.waitUntil(
				networkPromise.catch((error) => {
					console.error('[ServiceWorker] Background cache update failed:', error);
					// Return null to indicate failure - don't throw
					return null;
				})
			);
		}
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

// Service worker lifecycle management:
// Avoid long-running cache pruning during fetch events. Prune during activate instead.

self.addEventListener('install', (event) => {
 event.waitUntil(
  (async () => {
   const cache = await caches.open(PRECACHE_CACHE);
   
   // Cache URLs one by one to prevent entire cache from failing if one resource fails
   const now = Date.now();
   const cachePromises = PRECACHE_URLS.map(async (url) => {
    try {
     const response = await fetch(url, { cache: 'reload' });
     if (response.ok) {
      await cache.put(url, response);
      console.log('[SW] Precached:', url);
     }
    } catch (err) {
     // Skip failed resources - they'll be cached on-demand
     console.warn('[SW] Skipping failed precache:', url, err);
    }
   });
   
   // Wait for all cache operations with timeout
   await Promise.allSettled(cachePromises);
   
   console.log('[SW] Precaching complete, skipping waiting');
   self.skipWaiting();
  })()
 );
});

self.addEventListener('activate', (event) => {
  const activeCaches = new Set([
    PRECACHE_CACHE,
    RUNTIME_STATIC_CACHE,
    RUNTIME_API_CACHE,
    RUNTIME_PAGE_CACHE
  ]);

  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith('sgai-') && !activeCaches.has(key))
        .map((key) => caches.delete(key))
    );

    // Prune runtime caches here (safe: part of activation, not gameplay fetch).
    await Promise.all([
      pruneCache(RUNTIME_STATIC_CACHE),
      pruneCache(RUNTIME_API_CACHE),
      pruneCache(RUNTIME_PAGE_CACHE)
    ]);

    await self.clients.claim();
  })());
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

  // Game save API - cache with network-first strategy
  if (url.pathname.startsWith('/api/saves')) {
   event.respondWith(networkFirst(request, GAME_SAVE_CACHE));
   return;
  }

  event.respondWith(fetch(request));
  return;
 }

 if (isSameOrigin && ASSET_CACHE_RE.test(url.pathname)) {
  event.respondWith(staleWhileRevalidate(event, request, RUNTIME_STATIC_CACHE));
  return;
 }

 if (isSameOrigin) {
  event.respondWith(staleWhileRevalidate(event, request, RUNTIME_STATIC_CACHE));
 }
});

// Background sync for offline saves
self.addEventListener('sync', (event) => {
 if (event.tag === 'sync-game-saves') {
  event.waitUntil(syncGameSaves());
 }
});

// Periodic background sync
self.addEventListener('periodicsync', (event) => {
 if (event.tag === 'periodic-game-sync') {
  event.waitUntil(syncGameSaves());
 }
});

async function syncGameSaves() {
 // Get pending saves from IndexedDB or Cache
 const cache = await caches.open(GAME_SAVE_CACHE);
 const keys = await cache.keys();
 
 for (const request of keys) {
  try {
   const response = await cache.match(request);
   if (response) {
    // Replay save to server
    await fetch(request.url, {
     method: 'POST',
     headers: response.headers,
     body: await response.text()
    });
    await cache.delete(request);
   }
  } catch (error) {
   console.warn('[SW] Failed to sync save:', error);
  }
 }
}

// Push notifications for game events
self.addEventListener('push', (event) => {
 if (event.data) {
  try {
   const data = event.data.json();
   const title = data.title || 'ScaryGamesAI';
   const options = {
    body: data.body || 'New game event',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge.png',
    vibrate: [200, 100, 200],
    data: data.url || '/',
    actions: [
     { action: 'open', title: 'Open Game' },
     { action: 'dismiss', title: 'Dismiss' }
    ]
   };

   event.waitUntil(
    self.registration.showNotification(title, options)
   );
  } catch (error) {
   console.error('[SW] Push error:', error);
  }
 }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
 event.notification.close();

 if (event.action === 'dismiss') {
  return;
 }

 const urlToOpen = event.notification.data || '/';
 
 event.waitUntil(
  clients.matchAll({ type: 'window', includeUncontrolled: true })
   .then((windowClients) => {
    // Check if there's already a window open
    for (const client of windowClients) {
     if (client.url === urlToOpen && 'focus' in client) {
      return client.focus();
     }
    }
    // Open new window
    if (clients.openWindow) {
     return clients.openWindow(urlToOpen);
    }
   })
 );
});
