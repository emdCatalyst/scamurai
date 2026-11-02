import { ArrowRight } from 'lucide-react';
import type { ServiceDefinition } from '@/config/services';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { ACCENTS } from './accents';
import { StatusBadge } from './primitives';
import ServiceIcon from './ServiceIcon';

export interface ServiceCardProps {
  service: ServiceDefinition;
  name: string;
  tagline: string;
  summary: string;
  statusLabel: string;
  ctaLabel: string;
  /** e.g. "From 299 SAR/mo" — omitted for coming-soon services. */
  priceLabel?: string;
  headingLevel?: 'h2' | 'h3';
  className?: string;
}

/**
 * Catalog card for one service. The whole card is clickable through a single
 * stretched link on the title (one tab stop, one accessible name).
 */
export default function ServiceCard({
  service,
  name,
  tagline,
  summary,
  statusLabel,
  ctaLabel,
  priceLabel,
  headingLevel: Heading = 'h3',
  className,
}: ServiceCardProps) {
  const accent = ACCENTS[service.accent];

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7 transition-colors duration-200',
        accent.hoverBorder,
        'focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-navy-deep',
        accent.focusWithinRing,
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border',
            accent.soft,
            accent.border,
            accent.text
          )}
        >
          <ServiceIcon name={service.icon} size={24} />
        </span>
        <StatusBadge status={service.status} label={statusLabel} />
      </div>

      <Heading className="mt-6 text-xl font-bold text-white">
        <Link
          href={`/services/${service.slug}`}
          className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none"
        >
          {name}
        </Link>
      </Heading>
      <p className={cn('mt-2 text-sm font-semibold', accent.text)}>{tagline}</p>
      <p className="mt-4 flex-1 text-sm leading-relaxed text-white/65">{summary}</p>

      <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/[0.06] pt-5">
        {priceLabel ? (
          <span className="text-sm font-semibold text-white/80">{priceLabel}</span>
        ) : (
          <span />
        )}
        <span
          aria-hidden="true"
          className={cn('inline-flex items-center gap-1.5 text-sm font-semibold', accent.text)}
        >
          {ctaLabel}
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
        </span>
      </div>
    </article>
  );
}
