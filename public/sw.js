const CACHE_NAME = 'jntuh-academic-v6';
const PRECACHE = ['/vite.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k))).then(() =>
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isNavigation = event.request.mode === 'navigate'
    || url.pathname === '/'
    || url.pathname.endsWith('.html');
  const isHashedAsset = url.pathname.startsWith('/assets/');

  // Never cache HTML/navigations or hashed assets long-term — always network-first, no put
  if (isNavigation || isHashedAsset) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
