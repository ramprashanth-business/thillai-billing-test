// Thillai Billing — app-shell service worker.
// Only caches same-origin, GET requests (the HTML/manifest/icons). Supabase
// calls go straight to the network — this never caches or replays your data,
// it just lets the app itself open when you're offline or have a weak signal.
//
// IMPORTANT: bump CACHE_NAME every time you deploy a change to index.html
// (or any other app-shell file). Old caches are deleted automatically, and
// this file uses a network-first strategy, so as long as the number below
// is bumped, people will get the latest version on their very next reload
// instead of being stuck on a stale cached copy.
const CACHE_NAME = 'thillai-billing-shell-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => {}) // don't fail install if a single asset 404s
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first: always try to fetch the latest version first, and only
// fall back to the cached copy if the network is unavailable (offline, weak
// signal). This is the opposite of the old "cached-first" behaviour, which
// is what was causing updates to silently not show up.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return; // leave Supabase etc. alone

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
