"use client";

import { useEffect } from "react";
import { PREFIXED_LOCALES } from "@/i18n/paths";

/**
 * The service worker reads the prefixed locales (English has none) and the staff screens it keeps
 * for weak connections from its URL, so public/sw.js lists none of its own.
 */
export const SERVICE_WORKER_URL = `/sw.js?${new URLSearchParams({ prefixes: PREFIXED_LOCALES.join(","), screens: "submit" })}`;

/**
 * Registers the staff app's service worker (public/sw.js), which opens the
 * order screen instantly even on a weak or missing connection. Production
 * only: in development, cached chunks would hide code changes, so a worker
 * left behind by a production build on this machine is removed.
 */
export default function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => {});
      return;
    }
    navigator.serviceWorker.register(SERVICE_WORKER_URL).catch((err) => console.warn("[sw]", err));
  }, []);
  return null;
}
