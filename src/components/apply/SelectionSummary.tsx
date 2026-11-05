import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import type { PlanDefinition, ServiceDefinition } from '@/config/services';
import { cn } from '@/lib/cn';
import { isLiveService } from '@/lib/services/catalog';
import { ACCENTS } from '@/components/marketing/accents';
import { StatusBadge } from '@/components/marketing/primitives';
import ServiceIcon from '@/components/marketing/ServiceIcon';
import PlanPriceTag from './PlanPriceTag';

/**
 * Recap of the chosen service and plan at the top of the details step, so
 * the visitor (and their screen reader) confirms what they are applying for.
 * Coming-soon services add the early-access note instead of a price.
 */
export default function SelectionSummary({ service, plan }: { service: ServiceDefinition; plan?: PlanDefinition }) {
  const t = useTranslations('apply');
  const tServices = useTranslations('services');
  const tPlans = useTranslations('plans');
  const tMarketing = useTranslations('marketing');
  const accent = ACCENTS[service.accent];
  const serviceName = tServices(`${service.key}.name`);

  return (
    <div className="rounded-[20px] border border-white/10 bg-charcoal p-4 sm:p-5">
      <p className="text-xs font-semibold text-white/65">{t('selectionLabel')}</p>
      <div className="mt-3 flex items-center gap-4">
        <span
          className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent.tile)}
        >
          <ServiceIcon name={service.icon} size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">{serviceName}</p>
          {plan ? (
            <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-sm text-white/70">
              <span>{t('selectionPlan', { plan: tPlans(plan.tier) })}</span>
              <span aria-hidden="true">·</span>
              <PlanPriceTag pricing={plan.pricing} size="sm" />
            </p>
          ) : (
            <StatusBadge status={service.status} label={tMarketing(`status.${service.status}`)} className="mt-1.5" />
          )}
        </div>
      </div>
      {!isLiveService(service) && (
        <p className="mt-4 flex gap-3 rounded-xl border border-white/10 bg-navy p-3 text-sm leading-relaxed text-white/80">
          <Sparkles aria-hidden="true" focusable="false" size={16} className={cn('mt-0.5 shrink-0', accent.marker)} />
          <span>
            {t.rich('earlyAccess', {
              service: serviceName,
              strong: (chunks) => <strong className="font-semibold text-white">{chunks}</strong>,
            })}
          </span>
        </p>
      )}
    </div>
  );
}
