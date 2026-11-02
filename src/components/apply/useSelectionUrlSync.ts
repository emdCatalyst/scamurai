import { useEffect } from 'react';
import { withSelection, type Selection } from './selection';

/**
 * Mirrors the chosen service and plan in the address bar with
 * `history.replaceState`: no navigation, no new history entries, and the link
 * stays shareable. Next.js syncs `useSearchParams` with native history calls.
 */
export function useSelectionUrlSync({ service, plan }: Selection): void {
  useEffect(() => {
    const next = withSelection(window.location.href, { service, plan });
    if (next !== window.location.href) window.history.replaceState(null, '', next);
  }, [service, plan]);
}
