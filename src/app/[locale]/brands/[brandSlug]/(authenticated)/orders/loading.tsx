export default function OrdersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-8 w-32 rounded-lg bg-[var(--brand-surface-fg)]/10" />
        <div className="h-6 w-20 rounded-full bg-[var(--brand-surface-fg)]/10" />
      </div>

      <div className="h-16 rounded-2xl bg-[var(--brand-surface)]/50 border border-[var(--brand-border)]" />

      <div className="h-12 rounded-2xl bg-[var(--brand-surface)]/50 border border-[var(--brand-border)]" />

      <div className="bg-[var(--brand-surface)]/50 rounded-3xl border border-[var(--brand-border)] overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-16 border-b border-[var(--brand-border)] last:border-b-0"
          >
            <div className="h-full flex items-center px-6 gap-6">
              <div className="h-4 w-32 rounded bg-[var(--brand-surface-fg)]/10" />
              <div className="h-4 w-24 rounded bg-[var(--brand-surface-fg)]/10" />
              <div className="h-4 w-28 rounded bg-[var(--brand-surface-fg)]/10" />
              <div className="h-4 w-32 rounded bg-[var(--brand-surface-fg)]/10" />
              <div className="h-4 w-20 rounded bg-[var(--brand-surface-fg)]/10 ms-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
