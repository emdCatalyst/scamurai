'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function ApplicationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 bg-red-50/50 rounded-2xl border border-red-100 shadow-sm px-6 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-600">
        <AlertTriangle size={32} />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
      <p className="text-slate-600 max-w-md mb-8">
        We encountered an error while loading the applications. This has been logged, and you can try refreshing the page.
      </p>
      <button
        onClick={() => reset()}
        className="flex items-center gap-2 px-6 py-3 bg-navy text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-navy/20"
      >
        <RefreshCcw size={18} />
        Try again
      </button>
    </div>
  );
}
