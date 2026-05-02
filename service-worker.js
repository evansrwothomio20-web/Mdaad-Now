// ============================================================
// MDAAD SERVICE WORKER — v2 (Sprint 1 upgrade)
// Strategies:
//   Static assets   → Cache-first
//   /api/ routes    → Network-first, fallback to cache
//   Supabase REST   → Stale-While-Revalidate
//   Supabase Auth   → Network-only (never cache tokens)
// ============================================================
const CACHE_VERSION = 'mdaad-now-v9';
const DATA_CACHE    = 'mdaad-data-v9';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://cdn.jsdelivr.net/npm/htm@3.1.1/dist/htm.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700&family=Readex+Pro:wght@300;400;500;600&display=swap',
];

// ── Install: pre-cache all static assets ───────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old cache versions ──────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION && k !== DATA_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: routing strategies ──────────────────────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;
  if (event.request.method !== 'GET') return;

  // 1. Never cache Supabase Auth or Realtime endpoints (security)
  if (url.includes('/auth/v1/') || url.includes('/realtime/v1/')) return;

  // 2. Supabase REST API → Stale-While-Revalidate
  //    Serve cached data instantly, update cache in background
  if (url.includes('.supabase.co/rest/v1/')) {
    event.respondWith(staleWhileRevalidate(event.request, DATA_CACHE));
    return;
  }

  // 3. Local FastAPI routes → Network-first, fallback to cache
  if (url.includes('/api/')) {
    event.respondWith(networkFirstWithCache(event.request, DATA_CACHE));
    return;
  }

  // 4. CartoCDN map tiles → Cache-first (offline maps)
  if (url.includes('basemaps.cartocdn.com') || url.includes('tile.openstreetmap.org')) {
    event.respondWith(cacheFirstWithFallback(event.request, DATA_CACHE));
    return;
  }

  // 5. All other GET requests → Cache-first (static assets)
  event.respondWith(cacheFirstWithFallback(event.request, CACHE_VERSION));
});

// ── Strategy helpers ───────────────────────────────────────
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkFetch = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || await networkFetch;
}

async function networkFirstWithCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    return cached || new Response(JSON.stringify({error: 'offline'}), { 
      status: 503, 
      headers: {'Content-Type': 'application/json'} 
    });
  }
}

async function cacheFirstWithFallback(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// ── Background Sync ────────────────────────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-offline-requests') {
    event.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync() {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => client.postMessage({ type: 'SYNC_OFFLINE_QUEUE' }));
}

