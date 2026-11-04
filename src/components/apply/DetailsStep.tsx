import { useTranslations } from 'next-intl';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { PlanDefinition, ServiceDefinition } from '@/config/services';
import { isLiveService } from '@/lib/services/catalog';
import type { ApplicationFormValues } from '@/lib/validations/application';
import { toLatinDigits } from '@/lib/digits';
import SelectionSummary from './SelectionSummary';
import StepFieldset, { type StepFrame } from './StepFieldset';
import TextField from './TextField';
import type { ApplicationField } from './steps';

interface DetailsStepProps {
  frame: StepFrame;
  service: ServiceDefinition;
  plan?: PlanDefinition;
  register: UseFormRegister<ApplicationFormValues>;
  errors: FieldErrors<ApplicationFormValues>;
}

/** Last step: who is applying and how to reach them. */
export default function DetailsStep({ frame, service, plan, register, errors }: DetailsStepProps) {
  const t = useTranslations('apply');
  const tServices = useTranslations('services');

  const errorFor = (field: ApplicationField) => {
    const message = errors[field]?.message;
    return message ? t(message) : undefined;
  };
  const description = isLiveService(service)
    ? t('steps.details.description')
    : t('steps.details.descriptionInterest', { service: tServices(`${service.key}.name`) });

  return (
    <StepFieldset {...frame} title={t('steps.details.title')} description={description}>
      <SelectionSummary service={service} plan={plan} />
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <TextField
          field={register('brandName')}
          label={t('brandName')}
          placeholder={t('brandNamePlaceholder')}
          autoComplete="organization"
          error={errorFor('brandName')}
        />
        <TextField
          field={register('branchCount', { setValueAs: toLatinDigits })}
          label={t('branchCount')}
          placeholder={t('branchCountPlaceholder')}
          hint={t('branchCountHint')}
          inputMode="numeric"
          autoComplete="off"
          error={errorFor('branchCount')}
        />
        <TextField
          field={register('contactName')}
          label={t('contactName')}
          placeholder={t('contactNamePlaceholder')}
          autoComplete="name"
          error={errorFor('contactName')}
        />
        <TextField
          field={register('contactEmail')}
          type="email"
          dir="ltr"
          label={t('contactEmail')}
          placeholder={t('contactEmailPlaceholder')}
          hint={t('contactEmailHint')}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          error={errorFor('contactEmail')}
        />
        <TextField
          field={register('phone', { setValueAs: toLatinDigits })}
          type="tel"
          dir="ltr"
          label={t('phone')}
          optionalLabel={t('phoneOptional')}
          placeholder={t('phonePlaceholder')}
          autoComplete="tel"
          inputMode="tel"
          error={errorFor('phone')}
        />
      </div>
    </StepFieldset>
  );
}
