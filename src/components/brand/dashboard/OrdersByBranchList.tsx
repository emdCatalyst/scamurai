'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

interface OrdersByBranchListProps {
  data: {
    branchName: string;
    count: number;
  }[];
  brandSlug: string;
}

export function OrdersByBranchList({ data, brandSlug }: OrdersByBranchListProps) {
  const t = useTranslations('brand.dashboard.branchPanel');
  const maxCount = data.length > 0 ? Math.max(...data.map(d => d.count)) : 0;

  return (
    <div className="bg-[var(--brand-surface)] rounded-[32px] p-8 shadow-sm border border-[var(--brand-border)] flex flex-col min-h-[400px]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-[var(--brand-surface-fg)]">{t('title')}</h3>
          <p className="text-xs font-medium text-[var(--brand-surface-fg-muted)] mt-1">{t('subtitle')}</p>
        </div>
        <Link 
          href={`/brands/${brandSlug}/orders`}
          className="text-xs font-bold text-[var(--brand-primary)] hover:underline flex items-center gap-1"
        >
          {t('viewAll')}
          <ArrowUpRight size={14} />
        </Link>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
        {data.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-2">
            <p className="text-sm font-bold text-[var(--brand-surface-fg-muted)]">No orders recorded this month</p>
          </div>
        ) : (
          data.map((item, index) => {
            const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-[var(--brand-surface-fg)] truncate max-w-[200px]">
                    {item.branchName}
                  </span>
                  <span className="font-black text-[var(--brand-background-fg)]" style={{ color: 'var(--brand-background)' }}>
                    {item.count} <span className="text-[10px] text-[var(--brand-surface-fg-muted)] font-bold uppercase">{t('orders')}</span>
                  </span>
                </div>
                <div className="h-2 w-full bg-[var(--brand-surface-fg)]/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--brand-primary)] rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
