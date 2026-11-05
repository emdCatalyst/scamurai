import { Check } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import type { ServiceAccent } from '@/config/services';
import { cn } from '@/lib/cn';
import { ACCENTS } from '@/components/marketing/accents';

interface RadioCardProps {
  /** `register(name)` of the radio group. */
  field: UseFormRegisterReturn;
  value: string;
  checked: boolean;
  /** Visual error state only; the group's fieldset announces the error (aria-invalid is not valid on role=radio). */
  invalid: boolean;
  accent: ServiceAccent;
  /** Id of the element that names this option. */
  labelledBy: string;
  /** Ids of the elements with its details (status, price, limits...). */
  describedBy?: string;
  className?: string;
  /** Card content. Must be phrasing content (spans), since it sits inside a <label>. */
  children: React.ReactNode;
}

/**
 * A native radio input wrapped in a selectable card. The input stays in the
 * tab order and accessibility tree (arrow keys move through the group); only
 * its visuals are replaced by the card styles and the check indicator.
 */
export default function RadioCard({
  field,
  value,
  checked,
  invalid,
  accent,
  labelledBy,
  describedBy,
  className,
  children,
}: RadioCardProps) {
  const styles = ACCENTS[accent];

  return (
    <label
      className={cn(
        'relative flex cursor-pointer rounded-[20px] border p-4 text-start transition-[border-color,background-color] duration-200 sm:p-5',
        'has-focus-visible:ring-2 has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-navy-deep',
        styles.focusWithinRing,
        checked
          ? cn(styles.border, 'bg-charcoal')
          : cn('bg-charcoal/50 hover:bg-charcoal', invalid ? 'border-red-400/50' : 'border-white/10', styles.hoverBorder),
        className
      )}
    >
      <input
        type="radio"
        value={value}
        className="sr-only"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        {...field}
      />
      {children}
      <span
        aria-hidden="true"
        className={cn(
          'absolute end-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border transition-colors duration-200 sm:end-5 sm:top-5',
          checked ? cn('border-transparent', styles.tile) : 'border-white/40'
        )}
      >
        {checked && <Check focusable="false" size={12} strokeWidth={3} />}
      </span>
    </label>
  );
}
