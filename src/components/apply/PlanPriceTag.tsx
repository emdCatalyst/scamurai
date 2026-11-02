import { useLocale, useTranslations } from 'next-intl';
import type { PlanPricing } from '@/config/services';
import { cn } from '@/lib/cn';
import { formatAmount } from '@/components/marketing/services/pricing';

const SIZES = {
  lg: { amount: 'text-3xl font-black', custom: 'text-2xl font-bold' },
  sm: { amount: 'text-sm font-semibold', custom: 'text-sm font-semibold' },
} as const;

/**
 * Monthly price of a plan, straight from the catalog ("299 SAR/mo"), or
 * "Custom pricing" for quoted plans. Same wording as the pricing pages.
 */
export default function PlanPriceTag({ pricing, size = 'lg' }: { pricing: PlanPricing | null; size?: keyof typeof SIZES }) {
  const locale = useLocale();
  const t = useTranslations('plans');
  const styles = SIZES[size];

  if (pricing === null) {
    return <span className={cn('text-white', styles.custom)}>{t('customPricing')}</span>;
  }

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
      <span className={cn('tabular-nums text-white', styles.amount)}>{formatAmount(locale, pricing.monthly)}</span>
      <span className="text-sm font-medium text-white/65">{`${t('currency')}${t('perMonth')}`}</span>
    </span>
  );
}
