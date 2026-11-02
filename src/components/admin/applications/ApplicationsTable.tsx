'use client';

import { useTranslations } from 'next-intl';
import { Inbox } from 'lucide-react';
import type { ApplicationListItem } from '@/lib/queries/applications';
import ApplicationRow from './ApplicationRow';

interface ApplicationsTableProps {
  applications: ApplicationListItem[];
  onOpen: (id: string) => void;
}

const HEADER_CELL = 'py-4 px-4 text-xs font-bold uppercase tracking-wider text-slate-600 text-start';

export default function ApplicationsTable({ applications, onOpen }: ApplicationsTableProps) {
  const t = useTranslations('admin.applications.table');

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-100 shadow-sm text-center px-6">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <Inbox size={32} aria-hidden="true" className="text-slate-400" />
        </div>
        <h2 className="text-lg font-bold text-slate-800 mb-1">{t('emptyTitle')}</h2>
        <p className="text-slate-600 text-sm">{t('emptyDesc')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <caption className="sr-only">{t('caption')}</caption>
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th scope="col" className={HEADER_CELL}>{t('brand')}</th>
              <th scope="col" className={HEADER_CELL}>{t('service')}</th>
              <th scope="col" className={HEADER_CELL}>{t('contact')}</th>
              <th scope="col" className={HEADER_CELL}>{t('plan')}</th>
              <th scope="col" className={HEADER_CELL}>{t('submitted')}</th>
              <th scope="col" className={HEADER_CELL}>{t('status')}</th>
              <th scope="col" className={HEADER_CELL}>
                <span className="sr-only">{t('details')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => (
              <ApplicationRow key={application.id} application={application} onOpen={onOpen} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
