import { useId } from 'react';
import { CircleAlert } from 'lucide-react';
import { idList } from './aria';

/** What the wizard hands every step so it can render its heading. */
export interface StepFrame {
  /** Focused when the visitor arrives at this step. */
  headingRef: React.Ref<HTMLHeadingElement>;
  /** "Step 2 of 3", read together with the step title. */
  counter: string;
}

interface StepFieldsetProps extends StepFrame {
  title: string;
  description?: string;
  /** Group-level error (radio groups). Text fields show errors under the input. */
  error?: string;
  children: React.ReactNode;
}

/**
 * One wizard step: a fieldset whose legend is the step heading, so screen
 * readers announce "Step 1 of 3, Which service do you need?" when entering
 * the group. Each step mounts fresh, which replays the short entrance.
 */
export default function StepFieldset({ headingRef, counter, title, description, error, children }: StepFieldsetProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  return (
    <fieldset
      aria-describedby={idList(description && descriptionId, error && errorId)}
      className="min-w-0 motion-safe:animate-[fade-in-up_0.35s_cubic-bezier(0.22,1,0.36,1)_both]"
    >
      <legend className="w-full">
        <h2 ref={headingRef} tabIndex={-1} className="scroll-mt-28 text-2xl font-bold leading-tight text-white outline-none sm:text-3xl">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-white/60 rtl:tracking-normal">
            {counter}
          </span>
          {title}
        </h2>
      </legend>
      {description && (
        <p id={descriptionId} className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-4 flex items-center gap-2 text-sm font-medium text-red-300">
          <CircleAlert aria-hidden="true" focusable="false" size={16} className="shrink-0" />
          {error}
        </p>
      )}
      <div className="mt-6">{children}</div>
    </fieldset>
  );
}
