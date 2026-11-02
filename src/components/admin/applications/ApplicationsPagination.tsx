'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getPageItems } from './pagination';

interface ApplicationsPaginationProps {
  total: number;
  pageSize: number;
  page: number;
  onPageChange: (page: number) => void;
}

const ARROW_BUTTON =
  'p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-navy hover:border-navy disabled:opacity-30 disabled:hover:text-slate-500 disabled:hover:border-slate-200 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50';

export default function ApplicationsPagination({ total, pageSize, page, onPageChange }: ApplicationsPaginationProps) {
  const t = useTranslations('admin.applications.pagination');
  const format = useFormatter();

  if (total === 0) return null;

  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <nav aria-label={t('label')} className="flex flex-wrap items-center justify-between gap-4 mt-8 px-2">
      <p className="text-sm text-slate-600">{t('showing', { start, end, total })}</p>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label={t('previous')}
            className={ARROW_BUTTON}
          >
            <ChevronLeft size={18} aria-hidden="true" className="rtl:rotate-180" />
          </button>

          {getPageItems(page, totalPages).map((item, index) =>
            item === 'gap' ? (
              <span key={`gap-${index}`} aria-hidden="true" className="px-2 text-slate-400">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onPageChange(item)}
                aria-label={t('page', { page: item })}
                aria-current={item === page ? 'page' : undefined}
                className={cn(
                  'w-10 h-10 rounded-lg text-sm font-bold transition-colors tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50',
                  item === page ? 'bg-navy text-white shadow-md shadow-navy/20' : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                {format.number(item)}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label={t('next')}
            className={ARROW_BUTTON}
          >
            <ChevronRight size={18} aria-hidden="true" className="rtl:rotate-180" />
          </button>
        </div>
      )}
    </nav>
  );
}
