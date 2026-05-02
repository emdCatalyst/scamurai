'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Users, ShieldCheck, Landmark, UserCircle2, ArrowRight } from 'lucide-react';

interface TeamOverviewPanelProps {
  data: Record<string, { active: number; total: number }>;
  brandSlug: string;
}

export function TeamOverviewPanel({ data, brandSlug }: TeamOverviewPanelProps) {
  const t = useTranslations('brand.dashboard.teamPanel');

  const roles = [
    { key: 'brand_admin', icon: ShieldCheck, color: 'text-[var(--brand-background)]', bg: 'bg-[var(--brand-background)]/10', bar: 'bg-[var(--brand-background)]' },
    { key: 'finance', icon: Landmark, color: 'text-[var(--brand-primary)]', bg: 'bg-[var(--brand-primary)]/10', bar: 'bg-[var(--brand-primary)]' },
    { key: 'staff', icon: UserCircle2, color: 'text-[#5cbf8f]', bg: 'bg-[#5cbf8f]/10', bar: 'bg-[#5cbf8f]' },
  ];

  return (
    <div className="bg-[var(--brand-surface)] rounded-[32px] p-8 shadow-sm border border-[var(--brand-border)] flex flex-col min-h-[400px]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-[var(--brand-surface-fg)]">{t('title')}</h3>
          <p className="text-xs font-medium text-[var(--brand-surface-fg-muted)] mt-1">Personnel overview</p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-[var(--brand-surface-fg)]/5 flex items-center justify-center text-[var(--brand-surface-fg-muted)]">
          <Users size={20} strokeWidth={1.5} />
        </div>
      </div>

      <div className="flex-1 space-y-4">
        {roles.map((role) => {
          const stats = data[role.key] || { active: 0, total: 0 };
          return (
            <div 
              key={role.key}
              className="p-5 rounded-2xl bg-[var(--brand-surface-fg)]/5 border border-[var(--brand-border)] flex items-center justify-between group hover:bg-[var(--brand-surface)] hover:shadow-md hover:border-transparent transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${role.bg} ${role.color} flex items-center justify-center`}>
                  <role.icon size={20} strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--brand-surface-fg)]">{t(role.key)}</h4>
                  <p className="text-[10px] font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-widest">
                    {stats.active} {t('active')} / {stats.total} total
                  </p>
                </div>
              </div>
              <div className="h-1.5 w-16 bg-[var(--brand-surface-fg)]/10 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${role.bar} rounded-full transition-all duration-700`}
                  style={{ width: `${stats.total > 0 ? (stats.active / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <Link 
          href={`/brands/${brandSlug}/users`}
          className="w-full py-4 bg-[var(--brand-surface-fg)]/5 text-[var(--brand-surface-fg-muted)] rounded-2xl font-bold hover:bg-[var(--brand-surface-fg)]/10 hover:text-[var(--brand-surface-fg)] transition-all flex items-center justify-center gap-2 text-sm"
        >
          {t('manageTeam')}
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
