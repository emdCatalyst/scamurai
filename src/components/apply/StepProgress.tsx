import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ProgressStep {
  id: string;
  label: string;
}

interface StepProgressProps {
  /** Accessible name of the list, e.g. "Application progress". */
  label: string;
  /** Screen-reader suffix for finished steps, e.g. "(completed)". */
  completedLabel: string;
  steps: readonly ProgressStep[];
  currentIndex: number;
}

/**
 * Wizard progress as an ordered list; the current step carries
 * `aria-current="step"`. On small screens only the current label is shown,
 * the others stay available to screen readers.
 */
export default function StepProgress({ label, completedLabel, steps, currentIndex }: StepProgressProps) {
  return (
    <ol role="list" aria-label={label} className="flex items-center gap-2 sm:gap-3">
      {steps.map((step, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === steps.length - 1;

        return (
          <li
            key={step.id}
            aria-current={isCurrent ? 'step' : undefined}
            className={cn('flex min-w-0 items-center gap-2 sm:gap-3', !isLast && 'flex-1')}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors duration-200',
                isComplete && 'border-transparent bg-mint text-navy-deep',
                isCurrent && 'border-sky bg-sky/15 text-sky',
                !isComplete && !isCurrent && 'border-white/20 text-white/65'
              )}
            >
              {isComplete ? <Check focusable="false" size={14} strokeWidth={3} /> : index + 1}
            </span>
            <span
              className={cn(
                'truncate text-sm font-semibold',
                isCurrent ? 'text-white' : 'sr-only text-white/65 sm:not-sr-only'
              )}
            >
              {step.label}
              {isComplete && <span className="sr-only"> {completedLabel}</span>}
            </span>
            {!isLast && (
              <span
                aria-hidden="true"
                className={cn('h-px min-w-4 flex-1 transition-colors duration-200', isComplete ? 'bg-mint/50' : 'bg-white/10')}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
