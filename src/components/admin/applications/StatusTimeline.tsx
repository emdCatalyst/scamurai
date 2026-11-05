'use client';

import { useId } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { CheckCircle2, Clock, CreditCard, FileText, XCircle, type LucideIcon } from 'lucide-react';
import type { ApplicationStatus } from '@/lib/applications/status';
import { buildTimeline, type TimelineSource } from './timeline';

const STEP_ICONS: Record<ApplicationStatus, { icon: LucideIcon; className: string }> = {
  pending: { icon: Clock, className: 'text-amber-600' },
  quoted: { icon: FileText, className: 'text-sky-600' },
  paid: { icon: CreditCard, className: 'text-violet-600' },
  approved: { icon: CheckCircle2, className: 'text-emerald-600' },
  rejected: { icon: XCircle, className: 'text-red-600' },
};

/** What actually happened to the application, from its lifecycle timestamps. */
export default function StatusTimeline({ application }: { application: TimelineSource }) {
  const t = useTranslations('admin.applications.timeline');
  const format = useFormatter();
  const headingId = useId();
  const entries = buildTimeline(application);

  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="text-sm font-semibold text-slate-900 mb-4">
        {t('title')}
      </h3>
      <ol className="relative space-y-6 before:absolute before:top-5 before:bottom-5 before:start-[19px] before:w-0.5 before:bg-slate-200">
        {entries.map(({ status, at, reference }) => {
          const { icon: Icon, className } = STEP_ICONS[status];
          return (
            <li key={status} className="relative flex items-start gap-4">
              <span className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white border-2 border-slate-200 shrink-0">
                <Icon size={18} aria-hidden="true" className={className} />
              </span>
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-sm font-bold text-slate-800">{t(`status.${status}`)}</p>
                <time dateTime={at.toISOString()} className="block mt-0.5 text-xs text-slate-500">
                  {format.dateTime(at, { dateStyle: 'medium', timeStyle: 'short' })}
                </time>
                {reference && (
                  <p className="mt-2 inline-flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                    {t.rich('paymentReference', {
                      reference,
                      value: (chunks) => <bdi className="tabular-nums font-semibold text-slate-900">{chunks}</bdi>,
                    })}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
