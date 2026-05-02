// service-worker.js — BULLETPROOF VERSION
self.addEventListener('fetch', event => {
  const url = event.request.url;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    (async () => {
      try {
        // Direct pass-through for API to prevent hijacking
        if (url.includes('/api/')) {
          const resp = await fetch(event.request);
          return resp;
        }

        // Cache-first for assets
        const cache = await caches.open('mdaad-static-v10');
        const cached = await cache.match(event.request);
        if (cached) return cached;

        const network = await fetch(event.request);
        if (network.ok) cache.put(event.request, network.clone());
        return network;
      } catch (err) {
        // ALWAYS return a valid Response object
        return new Response(JSON.stringify({ error: 'offline', details: err.message }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    })()
  );
});
