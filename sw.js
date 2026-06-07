const CACHE = '10xplus-v2';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['./', './index.html'])).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  return self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Always go network-first for Anthropic API
  if (e.request.url.includes('anthropic.com')) {
    e.respondWith(
      fetch(e.request, {credentials: 'omit'}).catch(() =>
        new Response(JSON.stringify({error: 'offline'}), {
          headers: {'Content-Type': 'application/json'}
        })
      )
    );
    return;
  }
  // Cache-first for everything else (app shell)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
