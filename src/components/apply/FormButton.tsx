import { cn } from '@/lib/cn';

const VARIANTS = {
  primary: 'bg-gradient-cta text-navy shadow-glow-sky hover:shadow-glow-lg active:scale-[0.98]',
  secondary: 'border border-white/15 bg-white/[0.04] text-white/85 hover:border-white/30 hover:bg-white/[0.08] hover:text-white',
} as const;

interface FormButtonProps extends Omit<React.ComponentProps<'button'>, 'disabled'> {
  variant?: keyof typeof VARIANTS;
  /**
   * While true the button ignores activation and is announced as disabled.
   * Uses aria-disabled rather than `disabled` so a focused button keeps focus.
   */
  busy?: boolean;
}

/** Pill button matching ButtonLink, with a visible keyboard focus ring. */
export default function FormButton({ variant = 'primary', busy = false, className, onClick, children, ...rest }: FormButtonProps) {
  return (
    <button
      {...rest}
      aria-disabled={busy || undefined}
      onClick={(event) => {
        if (busy) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      className={cn(
        'inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-[transform,box-shadow,background-color,border-color,color] duration-200 sm:w-auto',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky/60 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep',
        'aria-disabled:cursor-not-allowed aria-disabled:opacity-70',
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </button>
  );
}
