import { useEffect, useRef, useState } from 'react';
import type { StepId } from './steps';

/**
 * Wizard position plus focus management. After every step change, focus
 * moves to the new step's heading so keyboard and screen-reader users start
 * at the top of the new content. The first render never steals focus.
 */
export function useStepNavigation(steps: readonly StepId[], initialStep: StepId) {
  const [step, setStep] = useState(initialStep);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusHeadingOnChange = useRef(false);

  useEffect(() => {
    if (!focusHeadingOnChange.current) return;
    focusHeadingOnChange.current = false;
    headingRef.current?.focus();
  }, [step]);

  const index = steps.indexOf(step);

  function goTo(next: StepId | undefined) {
    if (!next) return;
    focusHeadingOnChange.current = true;
    setStep(next);
  }

  return {
    step,
    index,
    headingRef,
    isFirst: index === 0,
    isLast: index === steps.length - 1,
    goTo,
    goBack: () => goTo(steps[index - 1]),
    goNext: () => goTo(steps[index + 1]),
  };
}
