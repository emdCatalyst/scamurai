"use client";

import { useCallback, useEffect, useState } from "react";
import { pendingOrders, type PendingOrder } from "@/lib/imageQueue";
import { createOutbox } from "@/lib/outbox";
import { uploadOrder } from "@/lib/presignedUpload";

const outbox = createOutbox({ store: pendingOrders, upload: uploadOrder });

/** How often the outbox checks whether a retry is due. */
const POLL_MS = 15_000;

export interface OutboxState {
  waiting: number;
  failed: PendingOrder[];
  uploading: boolean;
}

/**
 * Keeps the phone's saved orders moving, with nothing for the worker to
 * press: uploads when the page opens, when the connection comes back, when
 * the app returns to the foreground, and on a timer for due retries.
 */
export function useOutbox(userId: string) {
  const [state, setState] = useState<OutboxState>({ waiting: 0, failed: [], uploading: false });

  const refresh = useCallback(async () => {
    const { waiting, failed } = await outbox.summary(userId);
    setState((s) => ({ ...s, waiting, failed }));
  }, [userId]);

  const flush = useCallback(
    async (force = false) => {
      setState((s) => ({ ...s, uploading: true }));
      try {
        await outbox.flush(userId, { force });
      } catch (err) {
        console.warn("[outbox]", err);
      } finally {
        setState((s) => ({ ...s, uploading: false }));
        await refresh().catch(() => {});
      }
    },
    [userId, refresh]
  );

  useEffect(() => {
    const first = setTimeout(() => void flush(), 0);
    const onOnline = () => void flush(true);
    const onVisible = () => {
      if (document.visibilityState === "visible") void flush();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => void flush(), POLL_MS);
    return () => {
      clearTimeout(first);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [flush]);

  /** Saves the order on the phone (resolves once it is on disk), then starts uploading. */
  const submit = useCallback(
    async (order: PendingOrder) => {
      await pendingOrders.save(order);
      await refresh();
      void flush(true);
    },
    [refresh, flush]
  );

  const retryFailed = useCallback(async () => {
    await outbox.retryFailed(userId);
    await flush(true);
  }, [userId, flush]);

  return { ...state, submit, uploadNow: () => flush(true), retryFailed };
}
