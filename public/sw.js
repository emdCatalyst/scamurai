/*
 * Staff app service worker, registered from the order screen by
 * src/components/staff/ServiceWorker.tsx in production.
 *
 * - The order screen comes from the network when it answers within 3 s, and
 *   otherwise from the last good copy; so does a server error (e.g. during a
 *   deploy). A worker on a weak or missing connection still gets a working
 *   screen, and saved orders upload later. An answer that sends the worker
 *   to sign in, or refuses them, deletes the copy.
 * - Hashed Next.js assets, /media logos, icons and fonts never change in
 *   place, so they come from the cache, which keeps the newest MAX_ASSETS.
 * - Everything else (APIs, other pages, other sites) goes to the network.
 *
 * The app's prefixed locales and the staff screens kept for weak connections
 * come from this script's URL (?prefixes=ar&screens=submit), so the app lists
 * them in one place. English has no prefix: /brands/<brand>/submit.
 *
 * Bump VERSION to drop every cache. The copy is made for the worker who was
 * signed in: on a shared phone, every sign-out and the sign-in page delete
 * it, and a copy made for someone else reloads from the server
 * (src/lib/staff/pageCache.ts).
 */
const VERSION = 'v1';
const ASSETS = `assets-${VERSION}`;
const PAGES = `pages-${VERSION}`;
const PAGE_TIMEOUT_MS = 3000;
const MAX_ASSETS = 400;
const IMMUTABLE = /^\/(_next\/static|media|icons|fonts)\//;

/** A comma-separated list from this script's URL; plain path segments only. */
function listed(name) {
  const value = new URL(self.location.href).searchParams.get(name) || '';
  return value.split(',').filter((part) => /^[a-z0-9-]+$/i.test(part));
}
/** Locales served under a /<locale> prefix; the default (English) is at the root. */
const PREFIXES = listed('prefixes');
const SCREENS = listed('screens');
/** /brands/<brand>/<screen>, or /<prefix>/brands/<brand>/<screen>; none when the URL lists no screens. */
const STAFF_SCREEN =
  SCREENS.length > 0
    ? new RegExp(
        `^${PREFIXES.length > 0 ? `(?:/(?:${PREFIXES.join('|')}))?` : ''}/brands/[^/]+/(?:${SCREENS.join('|')})/?$`
      )
    : null;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== ASSETS && key !== PAGES) await caches.delete(key);
      await trimAssets();
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate' && STAFF_SCREEN && STAFF_SCREEN.test(url.pathname)) {
    event.respondWith(staffScreen(event, url.pathname));
  } else if (IMMUTABLE.test(url.pathname)) {
    event.respondWith(cacheFirst(event));
  }
});

async function cacheFirst(event) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(event.request);
  if (cached) return cached;
  const response = await fetch(event.request);
  if (response.ok) {
    await cache.put(event.request, response.clone());
    event.waitUntil(trimAssets());
  }
  return response;
}

async function staffScreen(event, key) {
  const cache = await caches.open(PAGES);
  const network = fetch(event.request).then(async (response) => {
    // Keep only a real page: not a redirect to sign-in, not an error.
    if (response.ok && response.type === 'basic') await cache.put(key, response.clone());
    // Sent to sign in, or refused: the copy belongs to a session that is over.
    else if (response.type === 'opaqueredirect' || [401, 403, 404].includes(response.status)) await cache.delete(key);
    return response;
  });
  event.waitUntil(network.catch(() => undefined));

  const cached = await cache.match(key);
  if (!cached) return network;
  // A server error gets the copy as well: it still takes orders.
  const answer = network.then((response) => (response.status >= 500 ? cached : response), () => cached);
  const slow = new Promise((resolve) => setTimeout(() => resolve(cached), PAGE_TIMEOUT_MS));
  return Promise.race([answer, slow]);
}

let trimming = null;

/** Each deploy leaves hashed files behind: keep the newest MAX_ASSETS. One trim at a time. */
function trimAssets() {
  if (!trimming) {
    trimming = (async () => {
      const cache = await caches.open(ASSETS);
      const keys = await cache.keys();
      for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ASSETS))) await cache.delete(key);
    })().finally(() => {
      trimming = null;
    });
  }
  return trimming;
}
