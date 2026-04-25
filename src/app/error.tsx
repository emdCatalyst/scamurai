'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('GLOBAL ERROR:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Something went wrong!</h2>
          <p className="text-slate-600 mb-6 max-w-md">{error.message || 'A runtime error occurred.'}</p>
          <button
            onClick={() => reset()}
            className="px-6 py-2 bg-sky text-white rounded-xl font-bold hover:bg-sky/90 transition-all"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
