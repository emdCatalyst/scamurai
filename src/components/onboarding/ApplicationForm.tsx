'use client';

import { useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { submitApplication, type ApplyErrorKey, type ApplyFieldErrors } from '@/actions/submitApplication';
import { getPlan, getService, isLiveService, isPlanTier, isServiceKey } from '@/lib/services/catalog';
import {
  APPLICATION_FIELDS,
  applicationSchema,
  type ApplicationData,
  type ApplicationFormValues,
} from '@/lib/validations/application';
import ApplyCard from '@/components/apply/ApplyCard';
import DetailsStep from '@/components/apply/DetailsStep';
import FormAlert from '@/components/apply/FormAlert';
import { HONEYPOT_FIELD } from '@/components/apply/honeypot';
import HoneypotField from '@/components/apply/HoneypotField';
import PlanStep from '@/components/apply/PlanStep';
import { parseSelection } from '@/components/apply/selection';
import ServiceStep from '@/components/apply/ServiceStep';
import StepNav from '@/components/apply/StepNav';
import StepProgress from '@/components/apply/StepProgress';
import {
  getFirstIncompleteStep,
  getStepFields,
  getStepForField,
  getSteps,
  type ApplicationField,
} from '@/components/apply/steps';
import { useSelectionUrlSync } from '@/components/apply/useSelectionUrlSync';
import { useStepNavigation } from '@/components/apply/useStepNavigation';
import ApplicationSuccess from './ApplicationSuccess';

/**
 * Text fields start as empty strings rather than undefined. Their "too short"
 * / "invalid" issues are then continuable in zod, so the schema's cross-field
 * rule (live services need a plan) still runs while later steps are untouched,
 * which is what lets the plan step be validated on its own.
 */
const EMPTY_DETAILS = { brandName: '', contactName: '', contactEmail: '', phone: '', branchCount: '' };

/**
 * Multi-step application: service → plan (live services only) → details.
 * Validation is the shared zod schema (the server action re-validates);
 * `/apply?service=<key>&plan=<tier>` preselects and opens the first
 * incomplete step, and the URL follows the choice without navigating.
 */
export default function ApplicationForm({ labelledBy }: { labelledBy?: string }) {
  const t = useTranslations('apply');
  const searchParams = useSearchParams();
  const [initialSelection] = useState(() => parseSelection(searchParams));
  const [submitted, setSubmitted] = useState<ApplicationData | null>(null);
  const [serverError, setServerError] = useState<ApplyErrorKey | null>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  const {
    register,
    control,
    handleSubmit,
    trigger,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormValues, unknown, ApplicationData>({
    resolver: zodResolver(applicationSchema),
    mode: 'onTouched',
    defaultValues: { ...EMPTY_DETAILS, ...initialSelection },
  });

  const [serviceValue, planValue] = useWatch({ control, name: ['service', 'plan'] });
  const service = isServiceKey(serviceValue) ? getService(serviceValue) : undefined;
  const plan = service && isPlanTier(planValue) ? getPlan(service, planValue) : undefined;
  const steps = getSteps(service);
  const nav = useStepNavigation(steps, getFirstIncompleteStep(initialSelection));
  useSelectionUrlSync({ service: service?.key, plan: plan?.tier });

  if (submitted) {
    return (
      <ApplicationSuccess
        service={submitted.service}
        plan={submitted.plan}
        contactName={submitted.contactName}
        contactEmail={submitted.contactEmail}
      />
    );
  }

  /** Shows the first invalid field: focus it on this step, or open the step that owns it. */
  function revealFirstInvalid(fields: readonly ApplicationField[]) {
    const [first] = fields;
    if (!first) return;
    const step = getStepForField(first);
    if (step === nav.step) setFocus(first);
    else nav.goTo(step);
  }

  function showServerFieldErrors(fieldErrors: ApplyFieldErrors) {
    const invalid = APPLICATION_FIELDS.filter((field) => fieldErrors[field]?.length);
    for (const field of invalid) setError(field, { type: 'server', message: fieldErrors[field]?.[0] });
    revealFirstInvalid(invalid);
  }

  const submit = handleSubmit(
    async (data) => {
      try {
        const result = await submitApplication({ ...data, [HONEYPOT_FIELD]: honeypotRef.current?.value ?? '' });
        if (result.success) {
          setSubmitted(data);
          return;
        }
        setServerError(result.error);
        if (result.fieldErrors) showServerFieldErrors(result.fieldErrors);
      } catch {
        setServerError('errorGeneral');
      }
    },
    (invalid) => revealFirstInvalid(APPLICATION_FIELDS.filter((field) => invalid[field]))
  );

  async function continueToNextStep() {
    if (await trigger(getStepFields(nav.step), { shouldFocus: true })) nav.goNext();
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setServerError(null);
    void (nav.isLast ? submit() : continueToNextStep());
  }

  function handleBack() {
    setServerError(null);
    nav.goBack();
  }

  const frame = {
    headingRef: nav.headingRef,
    counter: t('stepCounter', { current: nav.index + 1, total: steps.length }),
  };
  const groupError = (message: string | undefined) => (message ? t(message) : undefined);

  return (
    <ApplyCard>
      <form noValidate aria-labelledby={labelledBy} onSubmit={handleFormSubmit} className="relative">
        <StepProgress
          label={t('progressLabel')}
          completedLabel={t('stepCompleted')}
          steps={steps.map((id) => ({ id, label: t(`steps.${id}.label`) }))}
          currentIndex={nav.index}
        />

        <div className="mt-8">
          {nav.step === 'service' && (
            <ServiceStep
              frame={frame}
              field={register('service')}
              selected={service?.key}
              error={groupError(errors.service?.message)}
            />
          )}
          {nav.step === 'plan' && service && (
            <PlanStep
              frame={frame}
              service={service}
              field={register('plan')}
              selected={plan?.tier}
              error={groupError(errors.plan?.message)}
            />
          )}
          {nav.step === 'details' && service && (
            <DetailsStep frame={frame} service={service} plan={plan} register={register} errors={errors} />
          )}
        </div>

        <HoneypotField ref={honeypotRef} label={t('honeypotLabel')} />
        <FormAlert message={serverError ? t(serverError) : undefined} />
        <StepNav
          backLabel={t('back')}
          onBack={nav.isFirst ? undefined : handleBack}
          primaryLabel={
            nav.isLast ? t(service && isLiveService(service) ? 'submitQuote' : 'submitInterest') : t('continue')
          }
          isLastStep={nav.isLast}
          busy={isSubmitting}
          busyLabel={t('submitting')}
        />
      </form>
    </ApplyCard>
  );
}
