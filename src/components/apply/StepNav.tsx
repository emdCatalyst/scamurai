import { ArrowLeft, ArrowRight, LoaderCircle } from 'lucide-react';
import FormButton from './FormButton';

interface StepNavProps {
  backLabel: string;
  /** Omitted on the first step. */
  onBack?: () => void;
  /** "Continue" on intermediate steps, the submit label on the last one. */
  primaryLabel: string;
  isLastStep: boolean;
  busy: boolean;
  busyLabel: string;
}

/**
 * Back / Continue (or Submit) row. The primary button is always the form's
 * submit button, so pressing Enter anywhere in a step advances the wizard.
 */
export default function StepNav({ backLabel, onBack, primaryLabel, isLastStep, busy, busyLabel }: StepNavProps) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-white/[0.06] pt-6 sm:flex-row sm:items-center">
      {onBack && (
        <FormButton type="button" variant="secondary" busy={busy} onClick={onBack}>
          <ArrowLeft aria-hidden="true" focusable="false" size={16} className="rtl:rotate-180" />
          {backLabel}
        </FormButton>
      )}
      <FormButton type="submit" busy={busy} className="sm:ms-auto">
        {busy ? (
          <>
            <LoaderCircle aria-hidden="true" focusable="false" size={16} className="animate-spin" />
            {busyLabel}
          </>
        ) : (
          <>
            {primaryLabel}
            {!isLastStep && <ArrowRight aria-hidden="true" focusable="false" size={16} className="rtl:rotate-180" />}
          </>
        )}
      </FormButton>
    </div>
  );
}
