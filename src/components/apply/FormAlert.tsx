import { CircleAlert } from 'lucide-react';

/**
 * Form-level error. The alert region is always rendered (empty when there is
 * nothing to say) so screen readers reliably announce a message added later.
 */
export default function FormAlert({ message }: { message?: string }) {
  return (
    <div role="alert" aria-atomic="true">
      {message && (
        <p className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm leading-relaxed text-red-200">
          <CircleAlert aria-hidden="true" focusable="false" size={18} className="mt-0.5 shrink-0" />
          {message}
        </p>
      )}
    </div>
  );
}
