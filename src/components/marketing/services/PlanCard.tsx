import { Check, Sparkles } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { LiveService, PlanDefinition } from '@/config/services';
import { cn } from '@/lib/cn';
import { ACCENTS } from '../accents';
import { ButtonLink } from '../primitives';
import { getApplyHref } from './links';
import PlanPrice from './PlanPrice';
import { getPlanFeatures } from './pricing';

/**
 * One plan of a live service, rendered as a list item of <ServicePricing>.
 * On large screens the card is a 4-row subgrid (name, price, button, features)
 * so those rows line up across all cards.
 */
export default async function PlanCard({ service, plan }: { service: LiveService; plan: PlanDefinition }) {
  const [t, tMarketing] = await Promise.all([getTranslations('plans'), getTranslations('marketing')]);
  const accent = ACCENTS[service.accent];
  const headingId = `${service.key}-plan-${plan.tier}`;

  return (
    <li
      className={cn(
        'reveal flex flex-col rounded-[28px] border p-8 lg:row-span-4 lg:grid lg:grid-rows-subgrid lg:gap-y-0',
        plan.featured ? cn('bg-charcoal', accent.border) : 'border-white/10 bg-charcoal/60'
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id={headingId} className="text-xl font-bold text-white">
          {t(plan.tier)}
        </h3>
        {plan.featured && (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold',
              accent.tile
            )}
          >
            <Sparkles aria-hidden="true" focusable="false" size={12} />
            {t('recommended')}
          </span>
        )}
      </div>

      <PlanPrice pricing={plan.pricing} accentText={accent.text} />

      <ButtonLink
        href={getApplyHref(service.key, plan.tier)}
        variant={plan.featured ? 'primary' : 'secondary'}
        aria-describedby={headingId}
        className="mt-8 w-full"
      >
        {plan.pricing ? tMarketing('getStarted') : t('contactUs')}
      </ButtonLink>

      <ul role="list" className="mt-8 space-y-3 border-t border-white/[0.08] pt-6">
        {getPlanFeatures(plan).map((feature) => (
          <li key={feature.key} className="flex gap-3 text-sm leading-relaxed text-white/80">
            <Check aria-hidden="true" focusable="false" size={16} className={cn('mt-1 shrink-0', accent.marker)} />
            {t(feature.key, feature.values)}
          </li>
        ))}
      </ul>
    </li>
  );
}
