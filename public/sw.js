/*
 * Staff app service worker, registered by src/components/staff/ServiceWorker.tsx
 * in production.
 *
 * - The order screen comes from the network when it answers within 3 s, and
 *   otherwise from the last good copy: a worker on a weak or missing
 *   connection still gets a working screen, and saved orders upload later.
 * - Hashed Next.js assets, /media logos, icons and fonts never change in
 *   place, so they come from the cache.
 * - Everything else (APIs, other pages, other sites) goes to the network.
 *
 * Bump VERSION to drop every cache. Signing out deletes the page cache
 * (StaffSignOutButton), so a shared phone never shows the last worker's screen.
 */
const VERSION = 'v1';
const ASSETS = `assets-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const PAGE_TIMEOUT_MS = 3000;
const MAX_ASSETS = 400;
const ORDER_SCREEN = /^\/(en|ar)\/brands\/[^/]+\/submit\/?$/;
const IMMUTABLE = /^\/(_next\/static|media|icons|fonts)\//;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== ASSETS && key !== PAGES) await caches.delete(key);
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate' && ORDER_SCREEN.test(url.pathname)) {
    event.respondWith(orderScreen(event, url.pathname));
  } else if (IMMUTABLE.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function orderScreen(event, key) {
  const cache = await caches.open(PAGES);
  const network = fetch(event.request).then(async (response) => {
    // Keep only a real page: not a redirect to sign-in, not an error.
    if (response.ok && response.type === 'basic') await cache.put(key, response.clone());
    return response;
  });
  event.waitUntil(network.then(() => trimAssets(), () => undefined));

  const cached = await cache.match(key);
  if (!cached) return network;
  const slow = new Promise((resolve) => setTimeout(() => resolve(cached), PAGE_TIMEOUT_MS));
  return Promise.race([network.catch(() => cached), slow]);
}

/** Old deploys leave hashed files behind: keep the newest MAX_ASSETS. */
async function trimAssets() {
  const cache = await caches.open(ASSETS);
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ASSETS))) await cache.delete(key);
}
