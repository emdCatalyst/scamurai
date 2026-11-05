'use client';

import { useId, type ReactNode } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Building2, Calendar, Languages, Layers, Mail, Phone, User, type LucideIcon } from 'lucide-react';
import type { ApplicationListItem } from '@/lib/queries/applications';
import PlanChip from './PlanChip';

interface DetailItem {
  key: string;
  icon: LucideIcon;
  label: string;
  value: ReactNode;
}

const LINK = 'text-navy hover:text-navy underline-offset-2 hover:underline outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 rounded';

/** Who applied and what they asked for. */
export default function ApplicantDetails({ application }: { application: ApplicationListItem }) {
  const t = useTranslations('admin.applications.detail');
  const format = useFormatter();
  const headingId = useId();
  const notProvided = <span className="font-normal italic text-slate-500">{t('notProvided')}</span>;

  const items: DetailItem[] = [
    { key: 'contactName', icon: User, label: t('contactName'), value: application.contactName ?? notProvided },
    {
      key: 'email',
      icon: Mail,
      label: t('email'),
      value: (
        <a href={`mailto:${application.contactEmail}`} dir="ltr" className={LINK}>
          {application.contactEmail}
        </a>
      ),
    },
    {
      key: 'phone',
      icon: Phone,
      label: t('phone'),
      value: application.phone ? (
        <a href={`tel:${application.phone.replace(/[^\d+]/g, '')}`} dir="ltr" className={LINK}>
          {application.phone}
        </a>
      ) : (
        notProvided
      ),
    },
    {
      key: 'branchCount',
      icon: Building2,
      label: t('branchCount'),
      value: application.branchCount === null ? notProvided : format.number(application.branchCount),
    },
    { key: 'plan', icon: Layers, label: t('plan'), value: <PlanChip plan={application.plan} /> },
    { key: 'locale', icon: Languages, label: t('locale'), value: t(`locales.${application.locale}`) },
    {
      key: 'submitted',
      icon: Calendar,
      label: t('submitted'),
      value: (
        <>
          <time dateTime={application.createdAt.toISOString()}>
            {format.dateTime(application.createdAt, { dateStyle: 'long', timeStyle: 'short' })}
          </time>
          <span className="block mt-0.5 text-xs font-normal text-slate-500">
            {format.relativeTime(application.createdAt)}
          </span>
        </>
      ),
    },
  ];

  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="text-sm font-semibold text-slate-900 mb-4">
        {t('applicantTitle')}
      </h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
        {items.map(({ key, icon: Icon, label, value }) => (
          <div key={key} className="min-w-0">
            <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold text-slate-500">
              <Icon size={14} aria-hidden="true" className="shrink-0 text-slate-400" />
              {label}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-800 break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
