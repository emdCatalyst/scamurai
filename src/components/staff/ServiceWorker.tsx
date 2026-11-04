"use client";

import { useEffect } from "react";

/**
 * Registers the staff app's service worker (public/sw.js), which opens the
 * order screen instantly even on a weak or missing connection. Production
 * only: in development, cached chunks would hide code changes.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => console.warn("[sw]", err));
  }, []);
  return null;
}
