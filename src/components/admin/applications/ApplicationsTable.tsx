'use client';

import { useTranslations } from 'next-intl';
import { Inbox } from 'lucide-react';
import ApplicationRow from './ApplicationRow';

interface ApplicationsTableProps {
  applications: any[];
  onDetailOpen: (app: any) => void;
}

export default function ApplicationsTable({
  applications,
  onDetailOpen,
}: ApplicationsTableProps) {
  const t = useTranslations('admin.applications.table');

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-slate-100 shadow-sm">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <Inbox size={32} className="text-slate-300" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">{t('emptyTitle')}</h3>
        <p className="text-slate-500 text-sm">{t('emptyDesc')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">{t('brandName')}</th>
              <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">{t('email')}</th>
              <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">{t('phone')}</th>
              <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">{t('plan')}</th>
              <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">{t('submitted')}</th>
              <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-slate-500">{t('status')}</th>
              <th className="py-4 px-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <ApplicationRow 
                key={app.id} 
                application={app} 
                onDetailOpen={onDetailOpen}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
