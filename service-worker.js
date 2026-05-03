// service-worker.js — MDAAD v11 (Resilient Architecture)
const CACHE_NAME = 'mdaad-premium-v11';
const ASSETS = [
  '/',
  '/index.html',
  '/index.css',
  '/app.js?v=11',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // API Pass-through (Network First)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: 'offline', timestamp: Date.now() }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Static Assets (Cache First)
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(networkResp => {
        if (networkResp.ok && event.request.method === 'GET') {
          const clone = networkResp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResp;
      });
    })
  );
});
