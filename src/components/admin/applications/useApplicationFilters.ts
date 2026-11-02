'use client';

import { useCallback, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { ApplicationListFilters } from '@/lib/queries/applications';
import { applyFilterChanges, toQueryString } from './listFilters';

/**
 * Filter changes navigate to the matching URL, which re-renders the server
 * page with fresh data. The navigation runs in a transition, so the current
 * results stay on screen (dimmed via `isPending`) until the new ones arrive.
 */
export function useApplicationFilters(filters: ApplicationListFilters) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const setFilters = useCallback(
    (changes: Partial<ApplicationListFilters>) => {
      const query = toQueryString(applyFilterChanges(filters, changes));
      startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
    },
    [filters, pathname, router]
  );

  return { setFilters, isPending };
}
