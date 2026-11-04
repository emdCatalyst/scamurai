/**
 * Sends what workers saved on the phone, oldest first: delivery orders
 * today, other photo evidence later. Pure logic: storage and upload are
 * passed in, so it is testable and the same engine serves every trigger
 * (page open, back online, timer).
 *
 * Branch phones are shared: each item carries the account it was saved
 * under, and only that account sends it.
 */

/** What the outbox needs of a saved item; the rest belongs to the service. */
export interface OutboxItem {
  id: string;
  /** Clerk user id of the worker who saved it. */
  userId: string;
  createdAt: number;
  attempts: number;
  nextAttemptAt?: number;
  /** Refused for good; kept until the worker corrects or discards it. */
  failed?: boolean;
  lastError?: string;
  /** The server's error code for the last failed attempt. */
  errorCode?: string;
  /** The field the server refused, if it named one. */
  errorField?: string;
}

export type UploadOutcome<T extends OutboxItem = OutboxItem> =
  | { status: 'sent' }
  /** Worth trying again later: counted, and each try waits longer. */
  | { status: 'retry'; error: string; code?: T['errorCode'] }
  /** Not really tried (offline, session to renew): not counted, and the round stops. */
  | { status: 'paused'; error: string }
  /** Refused for good: kept for the worker to correct or discard. */
  | { status: 'rejected'; error: string; code?: T['errorCode']; field?: T['errorField'] }
  /** Saved under another account than the signed-in one: it waits on the phone for its owner. */
  | { status: 'otherAccount'; error: string };

export interface OutboxStore<T extends OutboxItem> {
  get(id: string): Promise<T | undefined>;
  getAll(): Promise<T[]>;
  save(item: T): Promise<void>;
  remove(id: string): Promise<void>;
}

const BASE_DELAY_MS = 5_000;
const MAX_DELAY_MS = 5 * 60_000;
/** Longer than any delay below: an item due later than this means the phone's clock was moved. */
const LONGEST_DELAY_MS = MAX_DELAY_MS * 1.25;
/** Signed upload URLs last 15 minutes: an upload still going after that can't succeed. */
const WATCHDOG_MS = 15 * 60_000;

/** 5 s, 10 s, 20 s … up to 5 minutes, with jitter so a branch's phones don't retry in step. */
export function retryDelay(attempts: number, random: () => number = Math.random): number {
  const base = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** Math.max(0, attempts - 1));
  return Math.round(base * (0.75 + random() * 0.5));
}

const byAge = (a: OutboxItem, b: OutboxItem) => a.createdAt - b.createdAt;
const oldest = (items: OutboxItem[]) => (items.length > 0 ? Math.min(...items.map((item) => item.createdAt)) : undefined);

export function createOutbox<T extends OutboxItem>(deps: {
  store: OutboxStore<T>;
  upload: (item: T, signal: AbortSignal) => Promise<UploadOutcome<T>>;
  /** Runs before a round's first upload, e.g. to renew the session. */
  prepare?: () => Promise<void>;
  /** Tabs share the phone's items: one tab uploads at a time, where the browser has Web Locks. */
  lockName?: string;
  /** Gives up on an upload that hangs in spite of its own time limits. */
  watchdogMs?: number;
  now?: () => number;
}) {
  const { store, upload, prepare, lockName = 'outbox', watchdogMs = WATCHDOG_MS, now = Date.now } = deps;
  /** Workers whose items the server said belong to another account than the signed-in one. */
  const otherAccountSignedIn = new Set<string>();
  /** Rounds asked for while one runs: worker → force. */
  const queued = new Map<string, boolean>();
  let running: Promise<void> | null = null;

  const isDue = (item: T) => {
    const wait = (item.nextAttemptAt ?? 0) - now();
    return wait <= 0 || wait > LONGEST_DELAY_MS;
  };

  async function attempt(item: T): Promise<UploadOutcome<T>> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const watchdog = new Promise<UploadOutcome<T>>((resolve) => {
      timer = setTimeout(() => {
        controller.abort();
        resolve({ status: 'retry', error: 'Upload took too long' });
      }, watchdogMs);
    });
    try {
      return await Promise.race([upload(item, controller.signal), watchdog]);
    } catch (err) {
      return { status: 'retry', error: err instanceof Error ? err.message : 'Upload failed' };
    } finally {
      clearTimeout(timer);
    }
  }

  async function run(userId: string, force: boolean) {
    if (otherAccountSignedIn.has(userId)) return;
    const due = (await store.getAll())
      .filter((item) => item.userId === userId && !item.failed && (force || isDue(item)))
      .sort(byAge);
    if (due.length > 0) await prepare?.();

    for (const item of due) {
      const outcome = await attempt(item);
      if (outcome.status === 'sent') {
        await store.remove(item.id);
        continue;
      }
      if (outcome.status === 'otherAccount') {
        otherAccountSignedIn.add(userId);
        return;
      }
      if (outcome.status === 'paused') return;

      // Another tab may have sent or discarded it meanwhile.
      if (!(await store.get(item.id).catch(() => item))) continue;
      const attempts = item.attempts + 1;
      const rejected = outcome.status === 'rejected';
      await store.save({
        ...item,
        attempts,
        failed: rejected,
        lastError: outcome.error,
        errorCode: outcome.code,
        errorField: rejected ? outcome.field : undefined,
        nextAttemptAt: now() + retryDelay(attempts),
      });
      // Most likely the connection: leave the rest for the next trigger instead of failing them all now.
      if (!rejected) return;
    }
  }

  async function withLock(task: () => Promise<void>): Promise<void> {
    const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
    if (!locks) return task();
    // Never waits: while another tab uploads, this round is skipped and the next trigger tries
    // again, so a tab that hangs, or that the browser froze, can't hold this one up.
    await locks.request(lockName, { ifAvailable: true }, async (lock) => {
      if (lock) await task();
    });
  }

  async function drain(): Promise<void> {
    let failure: unknown;
    try {
      while (queued.size > 0) {
        const [userId, force] = queued.entries().next().value as [string, boolean];
        queued.delete(userId);
        try {
          await withLock(() => run(userId, force));
        } catch (err) {
          failure ??= err;
        }
      }
    } finally {
      running = null;
    }
    if (failure !== undefined) throw failure;
  }

  /** Takes one of the worker's refused items out of the outbox. */
  async function takeOut(userId: string, id: string): Promise<T | undefined> {
    const item = await store.get(id);
    if (!item || item.userId !== userId || !item.failed) return undefined;
    await store.remove(id);
    return item;
  }

  return {
    /**
     * Uploads what is due (everything with `force`). Asked during a round,
     * it runs one more round after it, so an item saved meanwhile goes too.
     */
    flush(userId: string, { force = false } = {}): Promise<void> {
      queued.set(userId, force || queued.get(userId) === true);
      running ??= drain();
      return running;
    },

    /** Puts the worker's refused items back in line, e.g. after the cause was fixed. */
    async retryFailed(userId: string): Promise<void> {
      for (const item of await store.getAll()) {
        if (item.userId === userId && item.failed) {
          await store.save({ ...item, failed: false, nextAttemptAt: 0, errorCode: undefined, errorField: undefined });
        }
      }
    },

    /** Deletes one of the worker's refused items; false if there was none. */
    async discard(userId: string, id: string): Promise<boolean> {
      return (await takeOut(userId, id)) !== undefined;
    },

    /** Takes one of the worker's refused items back, to be corrected and saved again. */
    takeBack: takeOut,

    async summary(userId: string) {
      const items = await store.getAll();
      const mine = items.filter((item) => item.userId === userId);
      const waiting = mine.filter((item) => !item.failed);
      const others = items.filter((item) => item.userId !== userId);
      return {
        waiting: waiting.length,
        failed: mine.filter((item) => item.failed).sort(byAge),
        /** When the oldest item still waiting was saved, if any. */
        oldestWaitingAt: oldest(waiting),
        /** Items other accounts saved on this phone: they upload when their owner signs in here. */
        otherAccounts: others.length,
        oldestOtherAt: oldest(others),
        /** The server said someone else is signed in: this screen was made for another worker. */
        otherAccountSignedIn: otherAccountSignedIn.has(userId),
      };
    },
  };
}

/**
 * `store`, except that an item the phone can't save (storage full or
 * broken) is kept in memory: it still uploads while the page stays open.
 */
export function withMemoryFallback<T extends OutboxItem>(store: OutboxStore<T>) {
  const kept = new Map<string, T>();
  return {
    async get(id: string): Promise<T | undefined> {
      return kept.get(id) ?? store.get(id);
    },
    async getAll(): Promise<T[]> {
      // With items in memory, a broken store must not keep them from being sent.
      const saved = await store.getAll().catch((err) => {
        if (kept.size === 0) throw err;
        return [] as T[];
      });
      return [...saved.filter((item) => !kept.has(item.id)), ...kept.values()];
    },
    async save(item: T): Promise<void> {
      try {
        await store.save(item);
        kept.delete(item.id);
      } catch {
        kept.set(item.id, item);
      }
    },
    async remove(id: string): Promise<void> {
      const wasKept = kept.delete(id);
      try {
        await store.remove(id);
      } catch (err) {
        // Kept because the store fails: a copy it may still hold is recognised as sent next time.
        if (!wasKept) throw err;
      }
    },
    /** Keeps an item that couldn't be saved. */
    keep(item: T): void {
      kept.set(item.id, item);
    },
    /** Items only in memory: lost if the page closes before they are sent. */
    get unsaved(): number {
      return kept.size;
    },
  };
}
