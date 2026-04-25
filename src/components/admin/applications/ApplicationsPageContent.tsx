'use client';

import { useState } from 'react';
import ApplicationsFilterBar from '@/components/admin/applications/ApplicationsFilterBar';
import ApplicationsTable from '@/components/admin/applications/ApplicationsTable';
import ApplicationsPagination from '@/components/admin/applications/ApplicationsPagination';
import ApplicationDetailDrawer from '@/components/admin/applications/ApplicationDetailDrawer';
import { AnimatePresence } from 'framer-motion';

interface ApplicationsPageContentProps {
  applications: any[];
  total: number;
  counts: Record<string, number>;
  status: string;
  search: string;
  sort: string;
  page: number;
  pageSize: number;
}

export default function ApplicationsPageContent({
  applications,
  total,
  counts,
  status,
  search,
  sort,
  page,
  pageSize,
}: ApplicationsPageContentProps) {
  const [selectedApplication, setSelectedApplication] = useState<any | null>(null);

  return (
    <div className="space-y-6 pb-20">
      <ApplicationsFilterBar
        counts={counts}
        currentStatus={status}
        currentSearch={search}
        currentSort={sort}
      />

      <ApplicationsTable
        applications={applications}
        onDetailOpen={setSelectedApplication}
      />

      <ApplicationsPagination
        total={total}
        pageSize={pageSize}
        currentPage={page}
      />

      <AnimatePresence mode="wait">
        {selectedApplication && (
          <ApplicationDetailDrawer
            application={selectedApplication}
            onClose={() => setSelectedApplication(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
