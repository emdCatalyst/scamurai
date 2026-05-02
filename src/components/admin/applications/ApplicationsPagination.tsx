'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ApplicationsPaginationProps {
  total: number;
  pageSize: number;
  currentPage: number;
}

export default function ApplicationsPagination({
  total,
  pageSize,
  currentPage,
}: ApplicationsPaginationProps) {
  const t = useTranslations('admin.applications.pagination');
  const router = useRouter();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const isAr = locale === 'ar';

  const totalPages = Math.ceil(total / pageSize);
  if (total === 0) return null;

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`?${params.toString()}`);
  };

  const startRange = (currentPage - 1) * pageSize + 1;
  const endRange = Math.min(currentPage * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mt-8 px-2">
      <p className="text-sm text-slate-500">
        {t('showing', { start: startRange, end: endRange, total })}
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-navy hover:border-navy disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-slate-200 transition-all"
        >
          {isAr ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
          // Logic for ellipsis can be added here if totalPages > 7
          if (
            page === 1 ||
            page === totalPages ||
            (page >= currentPage - 1 && page <= currentPage + 1)
          ) {
            return (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                  currentPage === page
                    ? 'bg-navy text-white shadow-md shadow-navy/20'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {page}
              </button>
            );
          }
          if (page === currentPage - 2 || page === currentPage + 2) {
            return (
              <span key={page} className="px-2 text-slate-400">
                ...
              </span>
            );
          }
          return null;
        })}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-navy hover:border-navy disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-slate-200 transition-all"
        >
          {isAr ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>
    </div>
  );
}
