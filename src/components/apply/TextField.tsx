import { useId } from 'react';
import { CircleAlert } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { cn } from '@/lib/cn';
import { idList } from './aria';

type InputProps = Omit<React.ComponentProps<'input'>, 'id' | 'className' | keyof UseFormRegisterReturn>;

interface TextFieldProps extends InputProps {
  /** `register(name)` result; validation rules live in the shared schema. */
  field: UseFormRegisterReturn;
  label: string;
  hint?: string;
  /** Marks the field optional ("Optional" next to the label). Fields are required otherwise. */
  optionalLabel?: string;
  /** Translated error message. */
  error?: string;
  className?: string;
}

/**
 * Labelled text input with hint and error wired through aria-describedby.
 * Inputs for left-to-right data (`dir="ltr"`: email, phone) stay aligned
 * with the other fields on right-to-left pages.
 */
export default function TextField({
  field,
  label,
  hint,
  optionalLabel,
  error,
  className,
  type = 'text',
  dir,
  ...inputProps
}: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 flex items-baseline gap-2 text-sm font-medium text-white/85">
        {label}
        {optionalLabel && <span className="text-xs font-normal text-white/65">{optionalLabel}</span>}
      </label>
      <input
        id={id}
        type={type}
        dir={dir}
        aria-invalid={error ? true : undefined}
        aria-required={optionalLabel ? undefined : true}
        aria-describedby={idList(hint && hintId, error && errorId)}
        className={cn(
          // 16px text on phones stops iOS from zooming into the field.
          'block w-full rounded-xl border bg-white/[0.04] px-4 py-3 text-base text-white placeholder:text-white/40 transition-colors duration-200 sm:text-sm',
          'focus:outline-none focus-visible:ring-2',
          error
            ? 'border-red-400/60 focus-visible:ring-red-400/40'
            : 'border-white/10 hover:border-white/20 focus:border-sky/60 focus-visible:ring-sky/30',
          dir === 'ltr' && 'rtl:text-right'
        )}
        {...inputProps}
        {...field}
      />
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs leading-relaxed text-white/65">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-300">
          <CircleAlert aria-hidden="true" focusable="false" size={14} className="shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
