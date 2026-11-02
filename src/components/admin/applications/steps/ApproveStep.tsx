'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Loader2 } from 'lucide-react';
import Dialog from '@/components/ui/Dialog';
import { approveApplication } from '@/actions/approveApplication';
import { REQUEST_FAILED, callAction, type ReviewStepProps } from '../actionResult';
import { PRIMARY_BUTTON } from '../styles';
import CustomLimitsForm, { type CustomLimits } from './CustomLimitsForm';
import StepCard from './StepCard';

/** paid → approved: creates the brand and invites the customer to set it up. */
export default function ApproveStep({ application, onCompleted, onFailed }: ReviewStepProps) {
  const t = useTranslations('admin.applications.steps.approved');
  // `null` while the confirmation dialog is closed.
  const [approval, setApproval] = useState<{ limits?: CustomLimits } | null>(null);
  const [isPending, startTransition] = useTransition();

  const approve = () => {
    if (approval === null) return;
    startTransition(async () => {
      const result = await callAction(
        () => approveApplication({ id: application.id, customLimits: approval.limits }),
        REQUEST_FAILED
      );
      setApproval(null);
      if (!result.success) onFailed(result.error);
      else if (result.invitationSent) onCompleted(t('success'));
      else onCompleted(t('invitationFailed'), 'warning');
    });
  };

  const label = (
    <>
      {isPending ? (
        <Loader2 size={18} aria-hidden="true" className="animate-spin" />
      ) : (
        <CheckCircle2 size={18} aria-hidden="true" />
      )}
      {t('action')}
    </>
  );

  return (
    <StepCard
      title={t('title')}
      description={t('description', { brand: application.brandName, email: application.contactEmail })}
    >
      {application.requiresCustomLimits ? (
        <CustomLimitsForm submitLabel={label} disabled={isPending} onSubmit={(limits) => setApproval({ limits })} />
      ) : (
        <button type="button" onClick={() => setApproval({})} disabled={isPending} className={PRIMARY_BUTTON}>
          {label}
        </button>
      )}

      <Dialog
        isOpen={approval !== null}
        onClose={() => setApproval(null)}
        onConfirm={approve}
        title={t('confirmTitle', { brand: application.brandName })}
        description={t('confirmDescription')}
        confirmText={t('action')}
        type="danger"
        isLoading={isPending}
      />
    </StepCard>
  );
}
