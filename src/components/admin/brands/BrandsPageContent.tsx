'use client';

import { useState } from 'react';
import { BrandsFilterBar } from './BrandsFilterBar';
import { BrandsTable } from './BrandsTable';
import { BrandsPagination } from './BrandsPagination';
import { BrandDetailDrawer } from './BrandDetailDrawer';
import { AnimatePresence } from 'framer-motion';
import { BrandRow } from '@/lib/queries/brands';

interface BrandsPageContentProps {
  brands: BrandRow[];
  total: number;
  counts: Record<string, number>;
  status: string;
  plan: string;
  search: string;
  sort: string;
  page: number;
  pageSize: number;
}

export function BrandsPageContent({
  brands,
  total,
  counts,
  status,
  plan,
  search,
  sort,
  page,
  pageSize,
}: BrandsPageContentProps) {
  const [selectedBrand, setSelectedBrand] = useState<BrandRow | null>(null);

  return (
    <div className="space-y-6 pb-20">
      <BrandsFilterBar
        counts={counts}
        currentStatus={status}
        currentPlan={plan}
        currentSearch={search}
        currentSort={sort}
      />

      <div className="px-4 md:px-0">
        <BrandsTable
          brands={brands}
          onDetailOpen={setSelectedBrand}
        />
      </div>

      <BrandsPagination
        total={total}
        pageSize={pageSize}
        currentPage={page}
      />

      <AnimatePresence mode="wait">
        {selectedBrand && (
          <BrandDetailDrawer
            brand={selectedBrand}
            onClose={() => setSelectedBrand(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
