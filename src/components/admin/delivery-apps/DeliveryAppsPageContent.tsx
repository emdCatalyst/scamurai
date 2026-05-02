'use client';

import { useState } from 'react';
import { DeliveryAppsFilterBar } from './DeliveryAppsFilterBar';
import { DeliveryAppsTable } from './DeliveryAppsTable';
import { DeliveryAppsPagination } from './DeliveryAppsPagination';
import { DeliveryAppDetailDrawer } from './DeliveryAppDetailDrawer';
import { DeliveryAppFormModal } from './DeliveryAppFormModal';
import { AnimatePresence } from 'framer-motion';
import { CatalogAppRow } from '@/lib/queries/deliveryAppCatalog';

interface DeliveryAppsPageContentProps {
  apps: CatalogAppRow[];
  total: number;
  counts: Record<string, number>;
  status: string;
  search: string;
  sort: string;
  page: number;
  pageSize: number;
}

export function DeliveryAppsPageContent({
  apps,
  total,
  counts,
  status,
  search,
  sort,
  page,
  pageSize,
}: DeliveryAppsPageContentProps) {
  const [selectedApp, setSelectedApp] = useState<CatalogAppRow | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <div className="space-y-6 pb-20">
      <DeliveryAppsFilterBar
        counts={counts}
        currentStatus={status}
        currentSearch={search}
        currentSort={sort}
        onAddClick={() => setIsAddModalOpen(true)}
      />

      <div className="px-4 md:px-0">
        <DeliveryAppsTable
          apps={apps}
          onDetailOpen={setSelectedApp}
        />
      </div>

      <DeliveryAppsPagination
        total={total}
        pageSize={pageSize}
        currentPage={page}
      />

      <AnimatePresence mode="wait">
        {selectedApp && (
          <DeliveryAppDetailDrawer
            app={selectedApp}
            onClose={() => setSelectedApp(null)}
          />
        )}
      </AnimatePresence>

      <DeliveryAppFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}
