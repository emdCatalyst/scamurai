export default function ApplicationsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Filter Bar Skeleton */}
      <div className="sticky top-20 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-9 w-20 bg-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="flex gap-3 flex-1 justify-end max-w-md">
          <div className="h-10 flex-1 bg-slate-100 rounded-xl" />
          <div className="h-10 w-32 bg-slate-100 rounded-xl" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-12 bg-slate-50 border-b border-slate-100" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-16 border-b border-slate-100 flex items-center px-4 gap-4">
            <div className="h-4 w-32 bg-slate-100 rounded" />
            <div className="h-4 w-48 bg-slate-100 rounded" />
            <div className="h-4 w-24 bg-slate-100 rounded" />
            <div className="h-4 w-16 bg-slate-100 rounded" />
            <div className="h-4 w-24 bg-slate-100 rounded ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
