'use client';

import { useTranslations } from 'next-intl';
import { ShoppingBag, Clock, Banknote, MapPin } from 'lucide-react';
import AnimatedCounter from '@/components/ui/AnimatedCounter';

interface StatCardsProps {
  orderStats: {
    todayCount: number;
    needsReviewCount: number;
    monthlyRevenue: number;
  };
  branchStats: {
    branchCount: number;
    limit: number;
  };
}

export function StatCards({ orderStats, branchStats }: StatCardsProps) {
  const t = useTranslations('brand.dashboard');

  const cards = [
    {
      label: t('statOrders'),
      value: orderStats.todayCount,
      icon: ShoppingBag,
      bg: 'bg-[var(--brand-primary)]/10',
      text: 'text-[var(--brand-primary)]',
    },
    {
      label: t('statReview'),
      value: orderStats.needsReviewCount,
      icon: Clock,
      bg: 'bg-amber-500/10',
      text: 'text-amber-600',
    },
    {
      label: t('statRevenue'),
      value: orderStats.monthlyRevenue,
      icon: Banknote,
      bg: 'bg-[#5cbf8f]/10',
      text: 'text-[#5cbf8f]',
      suffix: ' SAR',
    },
    {
      label: t('statBranches'),
      value: `${branchStats.branchCount} / ${branchStats.limit}`,
      icon: MapPin,
      bg: 'bg-[var(--brand-background)]/10',
      text: 'text-[var(--brand-background)]',
      isString: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, i) => (
        <div 
          key={i}
          className="bg-[var(--brand-surface)] rounded-3xl p-6 shadow-sm border border-[var(--brand-border)] hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-2xl ${card.bg} ${card.text} flex items-center justify-center transition-transform group-hover:scale-110 duration-300`}>
              <card.icon size={24} strokeWidth={1.5} />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-wider ps-0.5">
              {card.label}
            </p>
            <div className="text-2xl font-black text-[var(--brand-surface-fg)] flex items-baseline gap-1">
              {card.isString ? (
                <span>{card.value}</span>
              ) : (
                <AnimatedCounter target={Number(card.value)} suffix={card.suffix} />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
