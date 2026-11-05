import { cn } from '@/lib/cn';
import { Link } from '@/i18n/navigation';
import type { ServiceStatus } from '@/config/services';

/**
 * Layout and typography building blocks for the public site. All are server
 * components (no 'use client'), so they add zero client JavaScript.
 */

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-7xl px-6 lg:px-10', className)}>{children}</div>;
}

const SECTION_TONES = {
  deep: 'bg-navy',
  navy: 'bg-navy',
  charcoal: 'bg-charcoal',
  plain: '',
} as const;

export function Section({
  id,
  labelledBy,
  tone = 'plain',
  className,
  children,
}: {
  id?: string;
  /** id of the heading that names this section (accessibility). */
  labelledBy?: string;
  tone?: keyof typeof SECTION_TONES;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn('relative overflow-hidden py-20 sm:py-28', SECTION_TONES[tone], className)}
    >
      {children}
    </section>
  );
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = 'center',
  as: Heading = 'h2',
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: 'center' | 'start';
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
}) {
  return (
    <div className={cn('max-w-3xl', align === 'center' ? 'mx-auto text-center' : 'text-start', className)}>
      {eyebrow && (
        <p className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60 rtl:tracking-normal">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-sky" />
          {eyebrow}
        </p>
      )}
      <Heading id={id} className="font-heading text-balance text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl rtl:leading-snug">
        {title}
      </Heading>
      {description && (
        <p className="mt-5 text-pretty text-base leading-relaxed text-white/65 sm:text-lg">{description}</p>
      )}
    </div>
  );
}

const BUTTON_VARIANTS = {
  primary:
    'bg-sky text-navy hover:bg-sky-400 active:bg-sky-600',
  secondary:
    'border border-white/15 bg-white/[0.04] text-white/85 hover:border-white/30 hover:bg-white/[0.08] hover:text-white',
  ghost: 'text-white/80 underline-offset-4 hover:text-white hover:underline',
} as const;

const BUTTON_SIZES = {
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-8 py-4 text-base',
} as const;

type LinkHref = React.ComponentProps<typeof Link>['href'];

/** Locale-aware link styled as a button. */
export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: {
  href: LinkHref;
  variant?: keyof typeof BUTTON_VARIANTS;
  size?: keyof typeof BUTTON_SIZES;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<typeof Link>, 'href' | 'className' | 'children'>) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky/60 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}

const STATUS_STYLES: Record<ServiceStatus, { pill: string; dot: string }> = {
  live: { pill: 'border-white/15 text-white', dot: 'bg-sky' },
  coming_soon: { pill: 'border-white/15 text-white/70', dot: 'bg-white/40' },
};

/** "Available now" / "Coming soon" pill. Pass the translated label in. */
export function StatusBadge({
  status,
  label,
  className,
}: {
  status: ServiceStatus;
  label: string;
  className?: string;
}) {
  const styles = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
        styles.pill,
        className
      )}
    >
      <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', styles.dot)} />
      {label}
    </span>
  );
}
