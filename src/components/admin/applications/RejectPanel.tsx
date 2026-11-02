'use client';

import { useId, useState, useTransition, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Loader2 } from 'lucide-react';
import { updateApplicationStatus } from '@/actions/updateApplicationStatus';
import { cn } from '@/lib/cn';
import { REQUEST_FAILED, callAction, type ReviewStepProps } from './actionResult';
import { REJECTION_NOTE_MAX_LENGTH, rejectionNoteSchema } from './reviewRules';
import {
  DANGER_BUTTON,
  FIELD_ERROR,
  FIELD_HINT,
  FIELD_LABEL,
  SECONDARY_BUTTON,
  TEXT_INPUT,
  TEXT_INPUT_INVALID,
  TEXT_INPUT_VALID,
} from './styles';

interface RejectPanelProps extends ReviewStepProps {
  onCancel: () => void;
}

/** Any open status → rejected. The reason is emailed to the applicant. */
export default function RejectPanel({ application, onCompleted, onFailed, onCancel }: RejectPanelProps) {
  const t = useTranslations('admin.applications.reject');
  const tErrors = useTranslations('admin.applications.errors');
  const id = useId();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const titleId = `${id}-title`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = rejectionNoteSchema.safeParse(reason);
    if (!parsed.success) {
      setError(tErrors('invalidRejectionNote'));
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await callAction(
        () =>
          updateApplicationStatus({
            id: application.id,
            expectedStatus: application.status,
            status: 'rejected',
            rejectionNote: parsed.data,
          }),
        REQUEST_FAILED
      );
      if (result.success) onCompleted(t('success'));
      else if (result.error === 'invalidRejectionNote') setError(tErrors(result.error));
      else onFailed(result.error);
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby={titleId}
      className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3"
    >
      <p id={titleId} className="flex items-center gap-2 text-red-800 font-semibold text-sm">
        <AlertCircle size={16} aria-hidden="true" className="shrink-0" />
        {t('title', { name: application.brandName })}
      </p>

      <div>
        <label htmlFor={id} className={FIELD_LABEL}>
          {t('label')}
        </label>
        <textarea
          id={id}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
          autoFocus
          maxLength={REJECTION_NOTE_MAX_LENGTH}
          dir="auto"
          placeholder={t('placeholder')}
          aria-invalid={error !== null}
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          className={cn(TEXT_INPUT, 'min-h-[100px] p-3', error ? TEXT_INPUT_INVALID : TEXT_INPUT_VALID)}
        />
        <p id={hintId} className={FIELD_HINT}>
          {t('hint')}
        </p>
        {error && (
          <p id={errorId} role="alert" className={FIELD_ERROR}>
            {error}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={isPending} className={SECONDARY_BUTTON}>
          {t('cancel')}
        </button>
        <button type="submit" disabled={isPending} className={DANGER_BUTTON}>
          {isPending && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
          {t('confirm')}
        </button>
      </div>
    </form>
  );
}
