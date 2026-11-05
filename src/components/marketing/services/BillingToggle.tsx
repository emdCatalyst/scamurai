import { getTranslations } from 'next-intl/server';
import { BILLING_PERIODS, type BillingPeriod } from './pricing';

/**
 * Monthly / annual switch built from native radio buttons, so it works with
 * the keyboard (Tab, arrow keys) and without JavaScript. It must sit inside the
 * `group/pricing` element of <ServicePricing>: plan prices react to the checked
 * radio through `group-has-[[value=annual]:checked]/pricing:*` variants.
 */
export default async function BillingToggle({
  name,
  discountPercent,
}: {
  /** Radio group name, unique on the page. */
  name: string;
  /** Best annual saving across plans, e.g. 20. */
  discountPercent: number | null;
}) {
  const t = await getTranslations('plans');
  const labels: Record<BillingPeriod, string> = { monthly: t('monthly'), annual: t('annually') };

  return (
    <fieldset className="flex justify-center">
      <legend className="sr-only">{t('billingPeriod')}</legend>
      <div className="inline-flex flex-wrap items-center justify-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1">
        {BILLING_PERIODS.map((period) => (
          <label
            key={period}
            className="flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:text-white has-checked:bg-white has-checked:text-navy has-focus-visible:ring-2 has-focus-visible:ring-sky/60 has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-navy-deep forced-colors:has-checked:outline-2"
          >
            <input
              type="radio"
              name={name}
              value={period}
              defaultChecked={period === 'monthly'}
              className="sr-only"
            />
            {labels[period]}
            {period === 'annual' && discountPercent !== null && (
              <span className="rounded-full bg-sky px-2 py-0.5 text-xs font-bold text-navy">
                {t('saveUpTo', { percent: discountPercent })}
              </span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
