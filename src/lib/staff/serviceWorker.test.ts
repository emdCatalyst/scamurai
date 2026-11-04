import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SERVICE_WORKER_URL } from '@/components/staff/ServiceWorker';

/** public/sw.js, run as the browser would, with Cache Storage and fetch faked. */

const ORIGIN = 'https://misdaq.test';
const SOURCE = fs.readFileSync(path.resolve(__dirname, '../../../public/sw.js'), 'utf8');

type Answer = { ok: boolean; status: number; type: string; text(): Promise<string>; clone(): Answer };

/** A response as a service worker sees it; `type` is what Node's Response can't set. */
function answer(status: number, body = '', type = 'basic'): Answer {
  return { ok: status >= 200 && status < 300, status, type, text: async () => body, clone: () => answer(status, body, type) };
}

function fakeCaches() {
  const stores = new Map<string, Map<string, Answer>>();
  const keyOf = (key: string | { url: string }) => new URL(typeof key === 'string' ? key : key.url, ORIGIN).href;
  return {
    stores,
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name)!;
      return {
        match: async (key: string | { url: string }) => store.get(keyOf(key))?.clone(),
        put: async (key: string | { url: string }, response: Answer) => void store.set(keyOf(key), response),
        delete: async (key: string | { url: string }) => store.delete(keyOf(key)),
        keys: async () => [...store.keys()].map((url) => ({ url })),
      };
    },
  };
}

function startWorker(scriptUrl = SERVICE_WORKER_URL) {
  const listeners = new Map<string, (event: object) => void>();
  /** Work the worker carries on with after answering (event.waitUntil). */
  const background: Array<Promise<unknown>> = [];
  const caches = fakeCaches();
  const fetch = vi.fn<(request: { url: string }) => Promise<Answer>>();
  const self = {
    location: new URL(scriptUrl, ORIGIN),
    addEventListener: (type: string, listener: (event: object) => void) => listeners.set(type, listener),
    skipWaiting: () => {},
    clients: { claim: async () => {} },
  };
  vm.runInNewContext(SOURCE, {
    self,
    caches,
    fetch,
    URL,
    setTimeout: (callback: () => void, ms: number) => setTimeout(callback, ms),
  });

  /** Dispatches a fetch event; resolves with what the worker answered, or null if it left the request alone. */
  async function request(pathname: string, { mode = 'navigate', method = 'GET', origin = ORIGIN } = {}) {
    // Set by the worker's handler, so declared without narrowing it to null.
    let answered = null as Promise<Answer> | null;
    listeners.get('fetch')!({
      request: { url: origin + pathname, mode, method },
      respondWith: (response: Promise<Answer>) => (answered = response),
      waitUntil: (work: Promise<unknown>) => background.push(work),
    });
    return answered ? await answered : null;
  }

  /** Waits for the work started so far after answering. */
  const settled = () => Promise.allSettled(background);

  async function activate() {
    let work: Promise<unknown> = Promise.resolve();
    listeners.get('activate')!({ waitUntil: (promise: Promise<unknown>) => (work = promise) });
    await work;
  }

  const pages = async () => caches.open('pages-v1');
  return { caches, fetch, request, settled, activate, pages };
}

const SCREEN = '/ar/brands/demo/submit';

describe('service worker', () => {
  afterEach(() => vi.useRealTimers());

  it('opens the order screen from the network and keeps a copy', async () => {
    const worker = startWorker();
    worker.fetch.mockResolvedValue(answer(200, 'fresh'));
    expect(await (await worker.request(SCREEN))!.text()).toBe('fresh');
    expect(await (await (await worker.pages()).match(SCREEN))!.text()).toBe('fresh');
  });

  it('opens the saved copy when the network is slow, down, or answers with a server error', async () => {
    const worker = startWorker();
    await (await worker.pages()).put(SCREEN, answer(200, 'saved'));

    vi.useFakeTimers();
    worker.fetch.mockReturnValue(new Promise(() => {}));
    const slow = worker.request(SCREEN);
    await vi.advanceTimersByTimeAsync(3_000);
    expect(await (await slow)!.text()).toBe('saved');
    vi.useRealTimers();

    worker.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await (await worker.request(SCREEN))!.text()).toBe('saved');

    worker.fetch.mockResolvedValue(answer(503, 'Something went wrong!'));
    expect(await (await worker.request(SCREEN))!.text()).toBe('saved');
  });

  it('deletes the copy when the server sends the worker to sign in, or refuses them', async () => {
    for (const refusal of [answer(0, '', 'opaqueredirect'), answer(401), answer(403), answer(404)]) {
      const worker = startWorker();
      await (await worker.pages()).put(SCREEN, answer(200, 'saved'));
      worker.fetch.mockResolvedValue(refusal);
      expect(await worker.request(SCREEN)).toBe(refusal);
      expect(await (await worker.pages()).match(SCREEN)).toBeUndefined();
    }
  });

  it('keeps no copy of a redirect or an error', async () => {
    const worker = startWorker();
    worker.fetch.mockResolvedValue(answer(500, 'error'));
    expect((await worker.request(SCREEN))!.status).toBe(500);
    expect(await (await worker.pages()).match(SCREEN)).toBeUndefined();
  });

  it('takes the locales and screens it keeps from its URL', async () => {
    const worker = startWorker();
    worker.fetch.mockImplementation(async () => answer(200, 'page'));
    expect(await worker.request('/en/brands/demo/submit')).not.toBeNull();
    expect(await worker.request('/ar/brands/demo/submit/')).not.toBeNull();
    expect(await worker.request('/fr/brands/demo/submit')).toBeNull();
    expect(await worker.request('/ar/brands/demo/orders')).toBeNull();

    // Registered without them (an older registration): no screen is kept.
    expect(await startWorker('/sw.js').request(SCREEN)).toBeNull();
  });

  it('leaves APIs, other sites and anything but GET to the network', async () => {
    const worker = startWorker();
    expect(await worker.request('/api/orders/upload-urls', { mode: 'cors' })).toBeNull();
    expect(await worker.request(SCREEN, { method: 'POST' })).toBeNull();
    expect(await worker.request('/_next/static/chunk.js', { origin: 'https://cdn.example', mode: 'no-cors' })).toBeNull();
    expect(worker.fetch).not.toHaveBeenCalled();
  });

  it('keeps hashed assets, and only the newest 400 of them', async () => {
    const worker = startWorker();
    const assets = await worker.caches.open('assets-v1');
    for (let i = 0; i < 400; i++) await assets.put(`/_next/static/old-${i}.js`, answer(200, 'old'));
    worker.fetch.mockResolvedValue(answer(200, 'new'));

    expect(await (await worker.request('/_next/static/new.js', { mode: 'no-cors' }))!.text()).toBe('new');
    expect(await (await worker.request('/_next/static/new.js', { mode: 'no-cors' }))!.text()).toBe('new');
    expect(worker.fetch).toHaveBeenCalledTimes(1);
    await worker.settled();
    const kept = (await assets.keys()).map((key) => key.url);
    expect(kept).toHaveLength(400);
    expect(kept).not.toContain(`${ORIGIN}/_next/static/old-0.js`);
    expect(kept).toContain(`${ORIGIN}/_next/static/new.js`);
  });

  it('drops other versions’ caches and trims the assets when it takes over', async () => {
    const worker = startWorker();
    await worker.caches.open('pages-v0');
    const assets = await worker.caches.open('assets-v1');
    for (let i = 0; i < 405; i++) await assets.put(`/_next/static/${i}.js`, answer(200));
    await worker.activate();
    expect(await worker.caches.keys()).toEqual(['assets-v1']);
    expect(await assets.keys()).toHaveLength(400);
  });
});
