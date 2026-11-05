'use client';

import { useTranslations } from 'next-intl';

interface BrandStatusBadgeProps {
  isActive: boolean;
  className?: string;
}

export function BrandStatusBadge({ isActive, className = '' }: BrandStatusBadgeProps) {
  const t = useTranslations('admin.brands.table');

  const finalStyles = {
    active: 'bg-[#4E9A72]/10 text-[#4E9A72] border-[#4E9A72]/20',
    suspended: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  const status = isActive ? 'active' : 'suspended';

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${finalStyles[status]} ${className}`}>
      {t(`status${status.charAt(0).toUpperCase() + status.slice(1)}`)}
    </span>
  );
}
