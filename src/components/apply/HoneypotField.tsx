import { useId } from 'react';
import { HONEYPOT_FIELD } from './honeypot';

/**
 * Hidden anti-spam field (see ./honeypot). Removed from the tab order and the
 * accessibility tree, ignored by password managers, and left uncontrolled:
 * the form reads it through `ref` only when submitting.
 */
export default function HoneypotField({ ref, label }: { ref: React.Ref<HTMLInputElement>; label: string }) {
  const id = useId();

  return (
    <div aria-hidden="true" className="sr-only">
      <label htmlFor={id}>{label}</label>
      <input
        ref={ref}
        id={id}
        name={HONEYPOT_FIELD}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        defaultValue=""
        data-1p-ignore=""
        data-lpignore="true"
        data-bwignore=""
        data-form-type="other"
      />
    </div>
  );
}
