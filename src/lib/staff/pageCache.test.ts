import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let pageCache: typeof import('./pageCache');
let reload: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  vi.resetModules();
  pageCache = await import('./pageCache');
  const session = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => session.get(key) ?? null,
    setItem: (key: string, value: string) => void session.set(key, value),
  });
  reload = vi.fn();
  vi.stubGlobal('location', { reload });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('clearSavedScreens', () => {
  it('deletes the saved order screens and nothing else', async () => {
    // The prefix public/sw.js names its page cache with.
    const kept = new Set(['pages-v1', 'pages-v0', 'assets-v1']);
    vi.stubGlobal('caches', { keys: async () => [...kept], delete: async (name: string) => kept.delete(name) });
    await pageCache.clearSavedScreens();
    expect([...kept]).toEqual(['assets-v1']);
  });

  it('never fails, also where the browser blocks storage or has none', async () => {
    vi.stubGlobal('caches', { keys: () => Promise.reject(new DOMException('Blocked', 'SecurityError')) });
    await expect(pageCache.clearSavedScreens()).resolves.toBeUndefined();
    vi.stubGlobal('caches', undefined);
    await expect(pageCache.clearSavedScreens()).resolves.toBeUndefined();
  });
});

describe('reloadFromServer', () => {
  it('drops the saved screen and reloads, at most once a minute so a refusing server cannot loop the page', async () => {
    const kept = new Set(['pages-v1']);
    vi.stubGlobal('caches', { keys: async () => [...kept], delete: async (name: string) => kept.delete(name) });
    vi.useFakeTimers({ now: 1_000_000, toFake: ['Date'] });
    await pageCache.reloadFromServer();
    expect(kept.size).toBe(0);
    expect(reload).toHaveBeenCalledTimes(1);

    await pageCache.reloadFromServer();
    expect(reload).toHaveBeenCalledTimes(1);
    vi.setSystemTime(1_000_000 + 60_000);
    await pageCache.reloadFromServer();
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('leaves the screen alone while the worker signs out', async () => {
    vi.stubGlobal('caches', undefined);
    pageCache.setSigningOut(true);
    await pageCache.reloadFromServer();
    expect(reload).not.toHaveBeenCalled();
  });
});
