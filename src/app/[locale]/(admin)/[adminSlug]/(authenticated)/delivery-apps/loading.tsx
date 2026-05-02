export default function DeliveryAppsLoading() {
  return (
    <div className="space-y-6 animate-pulse p-4 md:p-0">
      <div className="h-16 w-full bg-slate-100 rounded-xl mb-6 shadow-sm" />
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-12 w-full bg-slate-50 border-b border-slate-100" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 w-full border-b border-slate-50 last:border-0" />
        ))}
      </div>
    </div>
  );
}
