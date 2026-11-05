'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { Calendar, ChevronRight, Mail, Phone } from 'lucide-react';
import type { ApplicationListItem } from '@/lib/queries/applications';
import ApplicationStatusBadge from './ApplicationStatusBadge';
import PlanChip from './PlanChip';
import ServiceChip from './ServiceChip';

interface ApplicationRowProps {
  application: ApplicationListItem;
  onOpen: (id: string) => void;
}

/**
 * Review happens in the detail drawer, so the row only opens it: the whole row
 * for pointer users, the trailing button for keyboard and screen-reader users.
 */
export default function ApplicationRow({ application, onOpen }: ApplicationRowProps) {
  const t = useTranslations('admin.applications.table');
  const format = useFormatter();
  const open = () => onOpen(application.id);

  return (
    <tr
      onClick={open}
      className="group hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100 last:border-0"
    >
      <td className="py-4 px-4">
        <div className="font-bold text-slate-900 group-hover:text-navy transition-colors">
          {application.brandName}
        </div>
        {application.contactName && <div className="mt-0.5 text-xs text-slate-600">{application.contactName}</div>}
      </td>
      <td className="py-4 px-4">
        <ServiceChip service={application.service} />
      </td>
      <td className="py-4 px-4">
        <div className="text-sm text-slate-700 flex items-center gap-1.5">
          <Mail size={14} aria-hidden="true" className="text-slate-400 shrink-0" />
          <span dir="ltr">{application.contactEmail}</span>
        </div>
        <div className="mt-1 text-xs text-slate-600 flex items-center gap-1.5">
          <Phone size={14} aria-hidden="true" className="text-slate-400 shrink-0" />
          {application.phone ? <span dir="ltr">{application.phone}</span> : <span className="italic">{t('noPhone')}</span>}
        </div>
      </td>
      <td className="py-4 px-4">
        <PlanChip plan={application.plan} />
      </td>
      <td className="py-4 px-4">
        <div className="text-sm text-slate-600 flex items-center gap-1.5 whitespace-nowrap">
          <Calendar size={14} aria-hidden="true" className="text-slate-400 shrink-0" />
          <time
            dateTime={application.createdAt.toISOString()}
            title={format.dateTime(application.createdAt, { dateStyle: 'full', timeStyle: 'short' })}
          >
            {format.relativeTime(application.createdAt)}
          </time>
        </div>
      </td>
      <td className="py-4 px-4">
        <ApplicationStatusBadge status={application.status} />
      </td>
      <td className="py-4 px-4 text-end">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            open();
          }}
          aria-label={t('viewDetailsFor', { brand: application.brandName })}
          className="p-2 text-slate-500 hover:text-navy hover:bg-slate-100 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
        >
          <ChevronRight size={18} aria-hidden="true" className="rtl:rotate-180" />
        </button>
      </td>
    </tr>
  );
}
