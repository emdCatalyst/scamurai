import { useId } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type { UseFormRegisterReturn } from 'react-hook-form';
import type { ServiceDefinition, ServiceKey } from '@/config/services';
import { cn } from '@/lib/cn';
import { getStartingPrice, isLiveService, listServices } from '@/lib/services/catalog';
import { ACCENTS } from '@/components/marketing/accents';
import { StatusBadge } from '@/components/marketing/primitives';
import ServiceIcon from '@/components/marketing/ServiceIcon';
import { formatAmount } from '@/components/marketing/services/pricing';
import RadioCard from './RadioCard';
import StepFieldset, { type StepFrame } from './StepFieldset';

interface ServiceStepProps {
  frame: StepFrame;
  field: UseFormRegisterReturn<'service'>;
  selected?: ServiceKey;
  /** Translated group error. */
  error?: string;
}

/** Step 1: one radio card per catalog service, in display order. */
export default function ServiceStep({ frame, field, selected, error }: ServiceStepProps) {
  const t = useTranslations('apply');

  return (
    <StepFieldset {...frame} title={t('steps.service.title')} description={t('steps.service.description')} error={error}>
      <div className="grid gap-3">
        {listServices().map((service) => (
          <ServiceOption
            key={service.key}
            service={service}
            field={field}
            checked={selected === service.key}
            invalid={Boolean(error)}
          />
        ))}
      </div>
    </StepFieldset>
  );
}

function ServiceOption({
  service,
  field,
  checked,
  invalid,
}: {
  service: ServiceDefinition;
  field: UseFormRegisterReturn<'service'>;
  checked: boolean;
  invalid: boolean;
}) {
  const id = useId();
  const locale = useLocale();
  const t = useTranslations('apply');
  const tServices = useTranslations('services');
  const tMarketing = useTranslations('marketing');
  const tPlans = useTranslations('plans');
  const accent = ACCENTS[service.accent];
  const startingPrice = getStartingPrice(service);

  const note = !isLiveService(service)
    ? t('serviceInterestOnly')
    : startingPrice === null
      ? tPlans('customPricing')
      : tMarketing('startingFrom', { price: formatAmount(locale, startingPrice) });

  return (
    <RadioCard
      field={field}
      value={service.key}
      checked={checked}
      invalid={invalid}
      accent={service.accent}
      labelledBy={`${id}-name`}
      describedBy={`${id}-status ${id}-tagline ${id}-note`}
    >
      <span className="flex min-w-0 flex-1 items-start gap-4 pe-8">
        <span
          className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', accent.tile)}
        >
          <ServiceIcon name={service.icon} size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span id={`${id}-name`} className="text-base font-semibold text-white">
              {tServices(`${service.key}.name`)}
            </span>
            <span id={`${id}-status`}>
              <StatusBadge status={service.status} label={tMarketing(`status.${service.status}`)} />
            </span>
          </span>
          <span id={`${id}-tagline`} className="mt-1.5 block text-sm leading-relaxed text-white/70">
            {tServices(`${service.key}.tagline`)}
          </span>
          <span id={`${id}-note`} className="mt-2 block text-xs font-semibold text-white/80">
            {note}
          </span>
        </span>
      </span>
    </RadioCard>
  );
}
