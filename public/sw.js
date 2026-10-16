// Radix service worker: offline app shell. API calls (cross-origin) are not intercepted;
// plant data is already cached in localStorage by the app.
const CACHE = 'radix-shell-v1';
const SCOPE = self.registration.scope;
const SHELL = [SCOPE, `${SCOPE}manifest.webmanifest`, `${SCOPE}icon-192.png`, `${SCOPE}icon-512.png`];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !isFont) return;

  // Pages: network first so new deploys show up, fall back to cached shell offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(SCOPE, copy)); return res; })
        .catch(() => caches.match(SCOPE))
    );
    return;
  }

  // Hashed assets, icons, fonts: cache first.
  e.respondWith(
    caches.match(req).then((hit) =>
      hit || fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
    )
  );
});
