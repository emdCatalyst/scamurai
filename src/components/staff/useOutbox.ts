"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { createOutbox, withMemoryFallback } from "@/lib/outbox";
import { uploadOrder } from "@/lib/presignedUpload";
import { keepSavedData, LocalDbError, type LocalDbProblem } from "@/lib/staff/localDb";
import { newOrderId, pendingOrders, type PendingOrder } from "@/lib/staff/orderStore";
import { reloadFromServer } from "@/lib/staff/pageCache";
import { waitAtMost } from "@/lib/staff/timeout";
import { sendTelemetry } from "@/lib/telemetry";

/** clerk-js, once loaded, as window.Clerk. */
type ClerkGlobal = { session?: { getToken(): Promise<string | null> } | null };

/**
 * Clerk's session token lasts about a minute, so after the phone slept the
 * first upload would get 401. Asking for a token renews it, cookie included.
 */
function renewSession(): Promise<void> {
  const clerk = (window as Window & { Clerk?: ClerkGlobal }).Clerk;
  return waitAtMost(clerk?.session?.getToken() ?? Promise.resolve(), 5_000);
}

const store = withMemoryFallback(pendingOrders);
const outbox = createOutbox({ store, upload: uploadOrder, prepare: renewSession, lockName: "scamurai-orders" });

/** How often the outbox checks whether a retry is due. */
const POLL_MS = 15_000;
/** Back online, a branch's phones wait 2-8 s at random: not all at once, and with the session renewed. */
const ONLINE_DELAY_MS = { min: 2_000, max: 8_000 };
/** An order waiting this long on the phone is reported, at most every 5 minutes; a refused one once. */
const STUCK_AFTER_MS = 10 * 60_000;
const REPORT_EVERY_MS = 5 * 60_000;
/** A screen made for another account keeps trying to reload (at most once a minute, never while signing out). */
const RELOAD_RETRY_MS = 60_000;

let lastStuckReport = 0;
const reportedFailures = new Set<string>();

type Summary = Awaited<ReturnType<typeof outbox.summary>>;

function report({ waiting, failed, oldestWaitingAt, otherAccounts }: Summary, now: number) {
  sendTelemetry({
    type: "outbox",
    waiting,
    failed: failed.length,
    oldestWaitingSec: oldestWaitingAt ? Math.round((now - oldestWaitingAt) / 1000) : 0,
    otherAccounts,
  });
}

/** Lets the office see orders stuck on a phone (`[telemetry]` log lines), other workers' included. */
function reportStuck(summary: Summary) {
  const now = Date.now();
  const oldest = Math.min(summary.oldestWaitingAt ?? now, summary.oldestOtherAt ?? now);
  const stuck = now - oldest >= STUCK_AFTER_MS && now - lastStuckReport >= REPORT_EVERY_MS;
  const newlyRefused = summary.failed.filter((order) => !reportedFailures.has(order.id));
  if (!stuck && newlyRefused.length === 0) return;
  if (stuck) lastStuckReport = now;
  for (const order of newlyRefused) reportedFailures.add(order.id);
  report(summary, now);
}

export interface OutboxState {
  /** This worker's orders waiting to upload. */
  waiting: number;
  /** This worker's orders the server refused, oldest first, each with its `errorCode` (and `errorField`). */
  failed: PendingOrder[];
  uploading: boolean;
}

/** Where a submitted order went: the phone's storage, or only this page's memory (and why). */
export type SubmitResult = { onPhone: true } | { onPhone: false; problem: LocalDbProblem };

/**
 * Keeps the phone's saved orders moving, with nothing for the worker to
 * press: uploads when the page opens, when the connection comes back, when
 * the app returns to the foreground, and on a timer for due retries.
 *
 * `userId` is the worker the page was made for. A saved copy of the screen
 * can open for someone else on a shared phone: once Clerk has loaded and
 * says another account (or nobody) is signed in, or the server refuses an
 * order as another account's, the screen uploads nothing and reloads from
 * the server.
 */
export function useOutbox(userId: string) {
  // Until clerk-js has loaded, this is the user the page was made for.
  const { userId: signedInId } = useAuth();
  const [state, setState] = useState({
    waiting: 0,
    failed: [] as PendingOrder[],
    uploading: false,
    /** Orders other accounts saved on this phone (a count only): they upload when their owner signs in here. */
    otherAccounts: 0,
    /** Orders the phone couldn't save, kept by this page only: lost if it closes before they are sent. */
    unsaved: 0,
  });
  const [refusedAsOther, setRefusedAsOther] = useState(false);
  const wrongAccount = refusedAsOther || (signedInId !== undefined && signedInId !== userId);

  const refresh = useCallback(async () => {
    const summary = await outbox.summary(userId);
    const { waiting, failed, otherAccounts } = summary;
    setState((s) => ({ ...s, waiting, failed, otherAccounts, unsaved: store.unsaved }));
    if (summary.otherAccountSignedIn) setRefusedAsOther(true);
    reportStuck(summary);
  }, [userId]);

  const flush = useCallback(
    async (force = false) => {
      // Offline rounds would only fail, and counting them would space out the retries for nothing.
      if (!wrongAccount && navigator.onLine !== false) {
        setState((s) => ({ ...s, uploading: true }));
        try {
          await outbox.flush(userId, { force });
        } catch (err) {
          console.warn("[outbox]", err);
        } finally {
          setState((s) => ({ ...s, uploading: false }));
        }
      }
      await refresh().catch(() => {});
    },
    [userId, wrongAccount, refresh]
  );

  useEffect(() => {
    if (!wrongAccount) return;
    const reload = () => {
      if (navigator.onLine !== false) void reloadFromServer();
    };
    reload();
    const timer = setInterval(reload, RELOAD_RETRY_MS);
    window.addEventListener("online", reload);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", reload);
    };
  }, [wrongAccount]);

  useEffect(() => {
    const first = setTimeout(() => void flush(), 0);
    let backOnline: ReturnType<typeof setTimeout> | undefined;
    const onOnline = () => {
      clearTimeout(backOnline);
      const { min, max } = ONLINE_DELAY_MS;
      backOnline = setTimeout(() => void flush(true), min + Math.random() * (max - min));
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void flush();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => void flush(), POLL_MS);
    return () => {
      clearTimeout(first);
      clearTimeout(backOnline);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [flush]);

  /**
   * Saves the order on the phone (resolves once it is on disk), then starts
   * uploading. Never rejects: if the phone can't save it, this page keeps
   * it and uploads it while it stays open, and the result says why.
   */
  const submit = useCallback(
    async (order: PendingOrder): Promise<SubmitResult> => {
      let result: SubmitResult = { onPhone: true };
      try {
        await pendingOrders.save(order);
      } catch (err) {
        store.keep(order);
        result = { onPhone: false, problem: err instanceof LocalDbError ? err.problem : "unavailable" };
      }
      if (result.onPhone) keepSavedData();
      await refresh().catch(() => {});
      void flush(true);
      return result;
    },
    [refresh, flush]
  );

  const retryFailed = useCallback(async () => {
    await outbox.retryFailed(userId);
    await flush(true);
  }, [userId, flush]);

  /** Deletes one of the worker's refused orders from the phone; false if there was none. */
  const discard = useCallback(
    async (id: string): Promise<boolean> => {
      const discarded = await outbox.discard(userId, id);
      await refresh().catch(() => {});
      return discarded;
    },
    [userId, refresh]
  );

  /**
   * Takes one of the worker's refused orders out of the outbox for
   * correcting, `errorCode` and `errorField` included. Submitted again with
   * the same id, an order the server half-received is resumed and updated;
   * an id that belongs to another submission is replaced here.
   */
  const takeBack = useCallback(
    async (id: string): Promise<PendingOrder | undefined> => {
      const order = await outbox.takeBack(userId, id);
      await refresh().catch(() => {});
      return order && (order.errorCode === "order_conflict" ? { ...order, id: newOrderId() } : order);
    },
    [userId, refresh]
  );

  return { ...state, wrongAccount, submit, uploadNow: () => flush(true), retryFailed, discard, takeBack };
}
