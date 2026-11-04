import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LeftOnPhone, WorkerLeaving } from './signOut';

let signOutOfPhone: typeof import('./signOut').signOutOfPhone;
let reloadFromServer: typeof import('./pageCache').reloadFromServer;

/** The browser's Cache Storage, holding the service worker's caches. */
function fakeCaches(names: string[]) {
  const kept = new Set(names);
  return { kept, keys: async () => [...kept], delete: async (name: string) => kept.delete(name) };
}

function worker(left: LeftOnPhone, staysSignedIn = false) {
  return {
    uploadFirst: vi.fn(async () => left),
    confirmLeaving: vi.fn(() => !staysSignedIn),
    cleanUp: vi.fn(async () => {}),
  } satisfies WorkerLeaving;
}

const nothingLeft: LeftOnPhone = { unsent: 0, unsaved: 0 };

beforeEach(async () => {
  vi.resetModules();
  ({ signOutOfPhone } = await import('./signOut'));
  ({ reloadFromServer } = await import('./pageCache'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('signOutOfPhone', () => {
  it('signs out at once when nothing is left, deleting the drafts and the saved order screen', async () => {
    const caches = fakeCaches(['pages-v1', 'assets-v1']);
    vi.stubGlobal('caches', caches);
    const signOut = vi.fn(async () => {});
    const leaving = worker(nothingLeft);
    expect(await signOutOfPhone(signOut, leaving)).toBe(true);
    expect(leaving.confirmLeaving).not.toHaveBeenCalled();
    expect(leaving.cleanUp).toHaveBeenCalled();
    expect([...caches.kept]).toEqual(['assets-v1']);
    expect(signOut).toHaveBeenCalled();
  });

  it('asks first when orders would stay on the phone, and staying keeps everything', async () => {
    const caches = fakeCaches(['pages-v1']);
    vi.stubGlobal('caches', caches);
    const signOut = vi.fn(async () => {});
    const left = { unsent: 2, unsaved: 1 };
    const staying = worker(left, true);
    expect(await signOutOfPhone(signOut, staying)).toBe(false);
    expect(staying.confirmLeaving).toHaveBeenCalledWith(left);
    expect(staying.cleanUp).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
    expect([...caches.kept]).toEqual(['pages-v1']);

    expect(await signOutOfPhone(signOut, worker(left))).toBe(true);
    expect(signOut).toHaveBeenCalled();
  });

  it('never lets cleanup hold up signing out', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('caches', { keys: () => new Promise(() => {}) });
    const signOut = vi.fn(async () => {});
    const done = signOutOfPhone(signOut, { ...worker(nothingLeft), cleanUp: () => new Promise<void>(() => {}) });
    await vi.advanceTimersByTimeAsync(3_000);
    expect(await done).toBe(true);
    expect(signOut).toHaveBeenCalled();

    vi.stubGlobal('caches', {
      keys: async () => {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });
    expect(await signOutOfPhone(signOut)).toBe(true);
  });

  it('rejects when signing out fails or never finishes, so the screen can say so', async () => {
    vi.stubGlobal('caches', fakeCaches([]));
    await expect(signOutOfPhone(async () => Promise.reject(new Error('Network error')))).rejects.toThrow('Network error');

    vi.useFakeTimers();
    const stuck = expect(signOutOfPhone(() => new Promise(() => {}))).rejects.toThrow('Signing out took too long');
    await vi.advanceTimersByTimeAsync(15_000);
    await stuck;
  });

  it('keeps the order screen from reloading itself while signing out, and allows it again if that fails', async () => {
    vi.stubGlobal('caches', fakeCaches([]));
    const sessionStorage = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => sessionStorage.get(key) ?? null,
      setItem: (key: string, value: string) => void sessionStorage.set(key, value),
    });
    const reload = vi.fn();
    vi.stubGlobal('location', { reload });

    let finish!: () => void;
    const signingOut = signOutOfPhone(() => new Promise<void>((_resolve, reject) => (finish = () => reject(new Error('offline')))));
    await vi.waitFor(() => expect(finish).toBeDefined());
    await reloadFromServer();
    expect(reload).not.toHaveBeenCalled();

    finish();
    await expect(signingOut).rejects.toThrow('offline');
    await reloadFromServer();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
