'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function ApplicationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('admin.applications.loadError');

  useEffect(() => {
    console.error('[admin/applications] error:', error);
  }, [error]);

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center py-20 bg-red-50/50 rounded-2xl border border-red-100 shadow-sm px-6 text-center"
    >
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-600">
        <AlertTriangle size={32} aria-hidden="true" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">{t('title')}</h2>
      <p className="text-slate-600 max-w-md mb-8">{t('description')}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="flex items-center gap-2 px-6 py-3 bg-navy text-white font-bold rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-navy/20 outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
      >
        <RefreshCcw size={18} aria-hidden="true" />
        {t('retry')}
      </button>
    </div>
  );
}
