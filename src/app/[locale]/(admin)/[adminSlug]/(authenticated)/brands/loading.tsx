export default function BrandsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-200 rounded-lg" />
          <div className="h-4 w-64 bg-slate-100 rounded-lg" />
        </div>
      </div>

      <div className="h-16 w-full bg-slate-100 rounded-2xl" />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-12 w-full bg-slate-50 border-b border-slate-100" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 w-full border-b border-slate-50 last:border-0" />
        ))}
      </div>
    </div>
  );
}
