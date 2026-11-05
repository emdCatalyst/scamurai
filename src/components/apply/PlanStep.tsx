import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { Building2, Sparkles, Users, type LucideIcon } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import type { PlanDefinition, PlanTier, ServiceAccent, ServiceDefinition } from '@/config/services';
import { cn } from '@/lib/cn';
import { getMaxAnnualDiscountPercent, getPlans } from '@/lib/services/catalog';
import { ACCENTS } from '@/components/marketing/accents';
import { idList } from './aria';
import PlanPriceTag from './PlanPriceTag';
import RadioCard from './RadioCard';
import StepFieldset, { type StepFrame } from './StepFieldset';

interface PlanStepProps {
  frame: StepFrame;
  /** A live service; its plans, prices and limits come from the catalog. */
  service: ServiceDefinition;
  field: UseFormRegisterReturn<'plan'>;
  selected?: PlanTier;
  /** Translated group error. */
  error?: string;
}

/** Step 2 (live services only): one radio card per plan. */
export default function PlanStep({ frame, service, field, selected, error }: PlanStepProps) {
  const t = useTranslations('apply');
  const annualDiscount = getMaxAnnualDiscountPercent(service);

  return (
    <StepFieldset {...frame} title={t('steps.plan.title')} description={t('steps.plan.description')} error={error}>
      <div className="grid gap-3 md:grid-cols-3">
        {getPlans(service).map((plan) => (
          <PlanOption
            key={plan.tier}
            plan={plan}
            accent={service.accent}
            field={field}
            checked={selected === plan.tier}
            invalid={Boolean(error)}
          />
        ))}
      </div>
      {annualDiscount !== null && (
        <p className="mt-4 text-sm leading-relaxed text-white/70">{t('planAnnualNote', { percent: annualDiscount })}</p>
      )}
    </StepFieldset>
  );
}

function PlanOption({
  plan,
  accent,
  field,
  checked,
  invalid,
}: {
  plan: PlanDefinition;
  accent: ServiceAccent;
  field: UseFormRegisterReturn<'plan'>;
  checked: boolean;
  invalid: boolean;
}) {
  const id = useId();
  const t = useTranslations('plans');
  const styles = ACCENTS[accent];
  const { maxBranches, maxUsers } = plan.limits;

  return (
    <RadioCard
      field={field}
      value={plan.tier}
      checked={checked}
      invalid={invalid}
      accent={accent}
      labelledBy={`${id}-name`}
      describedBy={idList(plan.featured && `${id}-badge`, `${id}-details`)}
      className="flex-col"
    >
      <span className="flex flex-wrap items-center gap-2 pe-8">
        <span id={`${id}-name`} className="text-lg font-bold text-white">
          {t(plan.tier)}
        </span>
        {plan.featured && (
          <span
            id={`${id}-badge`}
            className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold', styles.tile)}
          >
            <Sparkles aria-hidden="true" focusable="false" size={11} />
            {t('recommended')}
          </span>
        )}
      </span>
      <span id={`${id}-details`} className="mt-4 flex flex-col gap-4">
        <PlanPriceTag pricing={plan.pricing} />
        <span className="flex flex-col gap-2 text-sm text-white/70">
          <PlanLimit
            icon={Building2}
            accentText={styles.marker}
            text={maxBranches === null ? t('limits.branchesUnlimited') : t('limits.branches', { count: maxBranches })}
          />
          <PlanLimit
            icon={Users}
            accentText={styles.marker}
            text={maxUsers === null ? t('limits.usersUnlimited') : t('limits.users', { count: maxUsers })}
          />
        </span>
      </span>
    </RadioCard>
  );
}

function PlanLimit({ icon: Icon, accentText, text }: { icon: LucideIcon; accentText: string; text: string }) {
  return (
    <span className="flex items-center gap-2">
      <Icon aria-hidden="true" focusable="false" size={15} className={cn('shrink-0', accentText)} />
      {text}
    </span>
  );
}
