import { useTranslations } from 'next-intl';
import type { PlanTier } from '@/config/services';
import { cn } from '@/lib/cn';

/** Plan tier, or "Interest" for interest registrations (no plan). */
export default function PlanChip({ plan, className }: { plan: PlanTier | null; className?: string }) {
  const t = useTranslations('admin.applications.plans');

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border whitespace-nowrap',
        plan ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-white text-slate-600 border-dashed border-slate-300',
        className
      )}
    >
      {t(plan ?? 'none')}
    </span>
  );
}
