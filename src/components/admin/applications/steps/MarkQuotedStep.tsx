'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { FileCheck, Loader2 } from 'lucide-react';
import Dialog from '@/components/ui/Dialog';
import { updateApplicationStatus } from '@/actions/updateApplicationStatus';
import { REQUEST_FAILED, callAction, type ReviewStepProps } from '../actionResult';
import { PRIMARY_BUTTON } from '../styles';
import StepCard from './StepCard';

/** pending → quoted, once the team has sent the customer a quote. */
export default function MarkQuotedStep({ application, onCompleted, onFailed }: ReviewStepProps) {
  const t = useTranslations('admin.applications.steps.quoted');
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  const markQuoted = () =>
    startTransition(async () => {
      const result = await callAction(
        () =>
          updateApplicationStatus({
            id: application.id,
            expectedStatus: application.status,
            status: 'quoted',
          }),
        REQUEST_FAILED
      );
      setConfirming(false);
      if (result.success) onCompleted(t('success'));
      else onFailed(result.error);
    });

  return (
    <StepCard
      title={t('title')}
      description={t('description', { name: application.contactName ?? application.brandName })}
    >
      <button type="button" onClick={() => setConfirming(true)} disabled={isPending} className={PRIMARY_BUTTON}>
        {isPending ? (
          <Loader2 size={18} aria-hidden="true" className="animate-spin" />
        ) : (
          <FileCheck size={18} aria-hidden="true" />
        )}
        {t('action')}
      </button>

      <Dialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={markQuoted}
        title={t('confirmTitle')}
        description={t('confirmDescription', { brand: application.brandName })}
        confirmText={t('action')}
        isLoading={isPending}
      />
    </StepCard>
  );
}
