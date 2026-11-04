import type { PendingOrder } from './staff/orderStore';

/**
 * Sends the phone's saved orders, oldest first, for the signed-in staff
 * member. Pure logic: storage and upload are passed in, so it is testable
 * and the same engine serves every trigger (page open, back online, timer).
 */

export type UploadOutcome = { ok: true } | { ok: false; retry: boolean; error: string };

export interface OutboxStore {
  getAll(): Promise<PendingOrder[]>;
  save(order: PendingOrder): Promise<void>;
  remove(id: string): Promise<void>;
}

const BASE_DELAY_MS = 5_000;
const MAX_DELAY_MS = 5 * 60_000;

/** 5 s, 10 s, 20 s … up to 5 minutes, with jitter so a branch's phones don't retry in step. */
export function retryDelay(attempts: number, random: () => number = Math.random): number {
  const base = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** Math.max(0, attempts - 1));
  return Math.round(base * (0.75 + random() * 0.5));
}

export function createOutbox(deps: {
  store: OutboxStore;
  upload: (order: PendingOrder) => Promise<UploadOutcome>;
  now?: () => number;
}) {
  const { store, upload, now = Date.now } = deps;
  let running: Promise<void> | null = null;

  async function run(userId: string, force: boolean) {
    const orders = (await store.getAll())
      .filter((order) => order.userId === userId && !order.failed)
      .sort((a, b) => a.createdAt - b.createdAt);

    for (const order of orders) {
      if (!force && (order.nextAttemptAt ?? 0) > now()) continue;
      const outcome = await upload(order);
      if (outcome.ok) {
        await store.remove(order.id);
        continue;
      }
      const attempts = order.attempts + 1;
      await store.save({
        ...order,
        attempts,
        lastError: outcome.error,
        failed: !outcome.retry,
        nextAttemptAt: now() + retryDelay(attempts),
      });
      // Most likely offline: leave the rest for the next trigger instead of failing them all now.
      if (outcome.retry) break;
    }
  }

  return {
    /** Uploads what is due (everything with `force`). Concurrent calls share one run. */
    flush(userId: string, { force = false } = {}): Promise<void> {
      running ??= run(userId, force).finally(() => {
        running = null;
      });
      return running;
    },

    /** Puts orders the server rejected back in line, e.g. after the cause was fixed. */
    async retryFailed(userId: string): Promise<void> {
      for (const order of await store.getAll()) {
        if (order.userId === userId && order.failed) await store.save({ ...order, failed: false, nextAttemptAt: 0 });
      }
    },

    async summary(userId: string) {
      const mine = (await store.getAll()).filter((order) => order.userId === userId);
      const waiting = mine.filter((order) => !order.failed);
      return {
        waiting: waiting.length,
        failed: mine.filter((order) => order.failed),
        /** When the oldest order still waiting was saved, if any. */
        oldestWaitingAt: waiting.length > 0 ? Math.min(...waiting.map((order) => order.createdAt)) : undefined,
      };
    },
  };
}
