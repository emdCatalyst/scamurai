'use client';

import { useCallback, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import type {
  ApplicationListFilters,
  ApplicationListItem,
  ApplicationStatusCounts,
} from '@/lib/queries/applications';
import { cn } from '@/lib/cn';
import ApplicationDetailDrawer from './ApplicationDetailDrawer';
import ApplicationsFilterBar from './ApplicationsFilterBar';
import ApplicationsPagination from './ApplicationsPagination';
import ApplicationsTable from './ApplicationsTable';
import { SELECTED_PARAM } from './listFilters';
import { useApplicationFilters } from './useApplicationFilters';

interface ApplicationsPageContentProps {
  applications: ApplicationListItem[];
  total: number;
  counts: ApplicationStatusCounts;
  filters: ApplicationListFilters;
  pageSize: number;
  /** Application to open on load (`?id=`, e.g. from the dashboard). */
  initialSelectedId: string | null;
}

export default function ApplicationsPageContent({
  applications,
  total,
  counts,
  filters,
  pageSize,
  initialSelectedId,
}: ApplicationsPageContentProps) {
  const { setFilters, isPending } = useApplicationFilters(filters);
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const selected = applications.find((application) => application.id === selectedId);

  const closeDrawer = useCallback(() => {
    setSelectedId(null);
    // Drop a deep-link `?id=` so a reload or filter change does not reopen it.
    // A native history update syncs with the Next router without a refetch.
    const url = new URL(window.location.href);
    if (url.searchParams.has(SELECTED_PARAM)) {
      url.searchParams.delete(SELECTED_PARAM);
      window.history.replaceState(null, '', url);
    }
  }, []);

  return (
    <div className="space-y-6 pb-20">
      <ApplicationsFilterBar filters={filters} counts={counts} onChange={setFilters} />

      <div aria-busy={isPending} className={cn('transition-opacity', isPending && 'opacity-60')}>
        <ApplicationsTable applications={applications} onOpen={setSelectedId} />
        <ApplicationsPagination
          total={total}
          pageSize={pageSize}
          page={filters.page}
          onPageChange={(page) => setFilters({ page })}
        />
      </div>

      <AnimatePresence>
        {selected && <ApplicationDetailDrawer key={selected.id} application={selected} onClose={closeDrawer} />}
      </AnimatePresence>
    </div>
  );
}
