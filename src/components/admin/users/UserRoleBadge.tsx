'use client';

import { useTranslations } from 'next-intl';

interface UserRoleBadgeProps {
  role: 'brand_admin' | 'finance' | 'staff';
  className?: string;
}

export function UserRoleBadge({ role, className = '' }: UserRoleBadgeProps) {
  const t = useTranslations('admin.users.filters.role');

  const styles = {
    brand_admin: 'bg-navy text-white border-navy/20',
    finance: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
    staff: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[role]} ${className}`}>
      {t(role)}
    </span>
  );
}
