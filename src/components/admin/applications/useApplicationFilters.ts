'use client';

import { useCallback, useEffect, useRef, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { ApplicationListFilters } from '@/lib/queries/applications';
import { applyFilterChanges, toQueryString } from './listFilters';

/**
 * Filter changes navigate to the matching URL, which re-renders the server
 * page with fresh data. The navigation runs in a transition, so the current
 * results stay on screen (dimmed via `isPending`) until the new ones arrive.
 *
 * Changes build on the latest *requested* filters, not only the committed
 * ones, so a second change made while the first is still loading (or from a
 * debounced search callback) keeps the first instead of overwriting it.
 */
export function useApplicationFilters(filters: ApplicationListFilters) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const requested = useRef<ApplicationListFilters | null>(null);

  // New committed filters arrived from the server: they are the base again.
  useEffect(() => {
    requested.current = null;
  }, [filters]);

  const setFilters = useCallback(
    (changes: Partial<ApplicationListFilters>) => {
      const next = applyFilterChanges(requested.current ?? filters, changes);
      requested.current = next;
      const query = toQueryString(next);
      startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
    },
    [filters, pathname, router]
  );

  return { setFilters, isPending };
}
