/**
 * The service worker (public/sw.js) keeps a copy of the order screen for weak
 * connections, made for the worker who was signed in. On a shared phone it
 * must never open for the next worker: every sign-out path and the sign-in
 * page delete it, and a screen that turns out to be someone else's reloads
 * from the server.
 */

const PAGE_CACHE_PREFIX = 'pages-';
const RELOADED_AT = 'staff-screen-reloaded-at';
/** At most one such reload a minute: a server that keeps refusing must not loop the page. */
const RELOAD_EVERY_MS = 60_000;

let signingOut = false;

/** Deletes the saved copies of the order screen. Never rejects. */
export async function clearSavedScreens(): Promise<void> {
  try {
    if (typeof caches === 'undefined') return;
    for (const key of await caches.keys()) if (key.startsWith(PAGE_CACHE_PREFIX)) await caches.delete(key);
  } catch {
    // Storage blocked: nothing could have been saved either.
  }
}

/** While signing out, Clerk's redirect takes the screen away; it must not reload on its own. */
export function setSigningOut(value: boolean): void {
  signingOut = value;
}

function reloadedRecently(): boolean {
  try {
    if (Date.now() - Number(sessionStorage.getItem(RELOADED_AT)) < RELOAD_EVERY_MS) return true;
    sessionStorage.setItem(RELOADED_AT, String(Date.now()));
    return false;
  } catch {
    // Without sessionStorage a loop couldn't be stopped: don't start one.
    return true;
  }
}

/** Loads the order screen again from the server, without the saved copy, e.g. when it was made for someone else. */
export async function reloadFromServer(): Promise<void> {
  if (signingOut || reloadedRecently()) return;
  await clearSavedScreens();
  location.reload();
}
