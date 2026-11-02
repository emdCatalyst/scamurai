import { getLocale, getTranslations } from 'next-intl/server';
import type { PlanPricing } from '@/config/services';
import { cn } from '@/lib/cn';
import { formatAmount, getAnnualBilling } from './pricing';

/** Shown while the annual radio of the surrounding `group/pricing` is checked. */
const SHOW_WHEN_ANNUAL = 'invisible group-has-[[value=annual]:checked]/pricing:visible';
const HIDE_WHEN_ANNUAL = 'group-has-[[value=annual]:checked]/pricing:invisible';

function PriceFigure({
  amount,
  unit,
  regular,
}: {
  amount: string;
  unit: string;
  /** Struck-through regular price, with its screen-reader label. */
  regular?: { label: string; amount: string };
}) {
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span className="text-5xl font-black tabular-nums text-white">{amount}</span>
      <span className="text-base font-medium text-white/65">{unit}</span>
      {regular && (
        <s className="text-base font-medium tabular-nums text-white/65">
          <span className="sr-only">{regular.label} </span>
          {regular.amount}
        </s>
      )}
    </p>
  );
}

/**
 * Price block of a plan card. Monthly and annual prices are both rendered and
 * stacked in one grid cell, so switching period never shifts the layout; the
 * hidden one uses `visibility: hidden` and is skipped by screen readers.
 */
export default async function PlanPrice({
  pricing,
  accentText,
}: {
  /** `null` = custom quote. */
  pricing: PlanPricing | null;
  /** Accent text class for the savings line. */
  accentText: string;
}) {
  const [locale, t] = await Promise.all([getLocale(), getTranslations('plans')]);

  if (pricing === null) {
    return (
      <div className="mt-6">
        <p className="text-3xl font-black text-white">{t('customPricing')}</p>
        <p className="mt-2 text-sm leading-relaxed text-white/65">{t('customPricingNote')}</p>
      </div>
    );
  }

  const amount = (value: number) => formatAmount(locale, value);
  const unit = `${t('currency')}${t('perMonth')}`;
  const annual = getAnnualBilling(pricing);

  return (
    <div className="mt-6 grid">
      <div className={cn('col-start-1 row-start-1', HIDE_WHEN_ANNUAL)}>
        <PriceFigure amount={amount(pricing.monthly)} unit={unit} />
        <p className="mt-2 text-sm text-white/65">{t('billedMonthly')}</p>
      </div>
      <div className={cn('col-start-1 row-start-1', SHOW_WHEN_ANNUAL)}>
        <PriceFigure
          amount={amount(pricing.annualMonthly)}
          unit={unit}
          regular={{ label: t('regularPrice'), amount: amount(pricing.monthly) }}
        />
        <p className="mt-2 text-sm text-white/65">{t('billedAnnually', { total: amount(annual.total) })}</p>
        <p className={cn('mt-1 text-sm font-semibold', accentText)}>
          {t('annualSavings', { amount: amount(annual.savings) })}
        </p>
      </div>
    </div>
  );
}
