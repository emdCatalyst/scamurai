'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { CreditCard, Loader2 } from 'lucide-react';
import Dialog from '@/components/ui/Dialog';
import { confirmApplicationPayment } from '@/actions/confirmApplicationPayment';
import { cn } from '@/lib/cn';
import { REQUEST_FAILED, callAction, type ReviewStepProps } from '../actionResult';
import { PAYMENT_REFERENCE_MAX_LENGTH, paymentReferenceSchema } from '../reviewRules';
import {
  FIELD_ERROR,
  FIELD_HINT,
  FIELD_LABEL,
  PRIMARY_BUTTON,
  TEXT_INPUT,
  TEXT_INPUT_INVALID,
  TEXT_INPUT_VALID,
} from '../styles';
import StepCard from './StepCard';

/** quoted → paid: records the bank transfer or invoice reference once the money is in. */
export default function ConfirmPaymentStep({ application, onCompleted, onFailed }: ReviewStepProps) {
  const t = useTranslations('admin.applications.steps.paid');
  const tErrors = useTranslations('admin.applications.errors');
  const id = useId();
  const [reference, setReference] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmedReference, setConfirmedReference] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = paymentReferenceSchema.safeParse(reference);
    if (!parsed.success) {
      setError(tErrors('invalidPaymentReference'));
      return;
    }
    setError(null);
    setConfirmedReference(parsed.data);
  };

  const confirmPayment = () => {
    if (confirmedReference === null) return;
    startTransition(async () => {
      const result = await callAction(
        () => confirmApplicationPayment({ id: application.id, paymentReference: confirmedReference }),
        REQUEST_FAILED
      );
      setConfirmedReference(null);
      if (result.success) onCompleted(t('success'));
      else if (result.error === 'invalidPaymentReference') setError(tErrors(result.error));
      else onFailed(result.error);
    });
  };

  return (
    <StepCard title={t('title')} description={t('description')}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor={id} className={FIELD_LABEL}>
            {t('referenceLabel')}
          </label>
          <input
            id={id}
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            required
            maxLength={PAYMENT_REFERENCE_MAX_LENGTH}
            autoComplete="off"
            spellCheck={false}
            dir="auto"
            placeholder={t('referencePlaceholder')}
            aria-invalid={error !== null}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
            className={cn(TEXT_INPUT, error ? TEXT_INPUT_INVALID : TEXT_INPUT_VALID)}
          />
          <p id={hintId} className={FIELD_HINT}>
            {t('referenceHint')}
          </p>
          {error && (
            <p id={errorId} role="alert" className={FIELD_ERROR}>
              {error}
            </p>
          )}
        </div>

        <button type="submit" disabled={isPending} className={PRIMARY_BUTTON}>
          {isPending ? (
            <Loader2 size={18} aria-hidden="true" className="animate-spin" />
          ) : (
            <CreditCard size={18} aria-hidden="true" />
          )}
          {t('action')}
        </button>
      </form>

      <Dialog
        isOpen={confirmedReference !== null}
        onClose={() => setConfirmedReference(null)}
        onConfirm={confirmPayment}
        title={t('confirmTitle')}
        description={t('confirmDescription', {
          reference: confirmedReference ?? '',
          brand: application.brandName,
        })}
        confirmText={t('action')}
        isLoading={isPending}
      />
    </StepCard>
  );
}
