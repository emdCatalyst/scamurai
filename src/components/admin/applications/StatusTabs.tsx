'use client';

import { useFormatter, useTranslations } from 'next-intl';
import type { ApplicationStatusCounts, ApplicationStatusFilter } from '@/lib/queries/applications';
import { cn } from '@/lib/cn';
import { STATUS_FILTERS } from './listFilters';

interface StatusTabsProps {
  current: ApplicationStatusFilter;
  counts: ApplicationStatusCounts;
  onSelect: (status: ApplicationStatusFilter) => void;
}

/** One toggle per lifecycle status (plus "All"), each with its count for the other filters. */
export default function StatusTabs({ current, counts, onSelect }: StatusTabsProps) {
  const t = useTranslations('admin.applications.filters');
  const format = useFormatter();

  return (
    <div
      role="group"
      aria-label={t('statusLabel')}
      className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto whitespace-nowrap"
    >
      {STATUS_FILTERS.map((status) => {
        const active = status === current;
        return (
          <button
            key={status}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(status)}
            className={cn(
              'px-3 md:px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50',
              active ? 'bg-white text-navy shadow-sm' : 'text-slate-600 hover:text-navy'
            )}
          >
            {t(`status.${status}`)}
            <span
              className={cn(
                'text-[11px] px-1.5 py-0.5 rounded-full tabular-nums',
                active ? 'bg-navy text-white' : 'bg-slate-200 text-slate-700'
              )}
            >
              {format.number(counts[status])}
            </span>
          </button>
        );
      })}
    </div>
  );
}
