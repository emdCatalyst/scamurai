import { Check } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ServiceDefinition } from '@/config/services';
import { cn } from '@/lib/cn';
import { getStartingPrice, isLiveService } from '@/lib/services/catalog';
import { ACCENTS } from '../accents';
import { ButtonLink, Container, Section, StatusBadge } from '../primitives';
import ServiceIcon from '../ServiceIcon';
import ApplyButton from './ApplyButton';
import { HERO_HIGHLIGHT_IDS, PAGE_NAMESPACE, serviceNamespace } from './content';
import { formatAmount } from './pricing';

/**
 * Top of a service page: the page's only h1 (the service name), its promise,
 * the main call to action and an "at a glance" card. No entrance animation:
 * the heading and summary are LCP candidates and must paint immediately.
 */
export default async function ServiceHero({
  service,
  breadcrumbs,
}: {
  service: ServiceDefinition;
  /** Rendered above the heading, e.g. <Breadcrumbs />. */
  breadcrumbs?: React.ReactNode;
}) {
  const [locale, t, tPage, tMarketing] = await Promise.all([
    getLocale(),
    getTranslations(serviceNamespace(service.key)),
    getTranslations(PAGE_NAMESPACE),
    getTranslations('marketing'),
  ]);
  const accent = ACCENTS[service.accent];
  const live = isLiveService(service);
  const startingPrice = getStartingPrice(service);
  const headingId = `${service.key}-hero-heading`;
  const glanceId = `${service.key}-glance`;

  const glanceFootnote = live
    ? startingPrice !== null && tMarketing('startingFrom', { price: formatAmount(locale, startingPrice) })
    : tPage('hero.earlyAccessNote');

  return (
    <Section tone="deep" labelledBy={headingId} className="pt-28 sm:pt-36">
      <Container className="relative">
        {breadcrumbs}

        <div className="mt-10 grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-16">
          <div>
            <StatusBadge status={service.status} label={tMarketing(`status.${service.status}`)} />
            <h1
              id={headingId}
              className="mt-5 text-balance text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl rtl:leading-snug"
            >
              {t('name')}
            </h1>
            <p className="mt-4 text-pretty text-xl font-semibold text-white/60 sm:text-2xl">{t('tagline')}</p>
            <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-white/70 sm:text-lg">
              {t('summary')}
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <ApplyButton service={service} />
              {live && (
                <ButtonLink href="#pricing" variant="secondary" size="lg">
                  {tPage('hero.seePricing')}
                </ButtonLink>
              )}
            </div>
          </div>

          <div className={cn('rounded-[28px] border bg-charcoal p-7', accent.border)}>
            <div className="flex items-center gap-4">
              <span
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                  accent.tile
                )}
              >
                <ServiceIcon name={service.icon} size={24} />
              </span>
              <p id={glanceId} className="text-sm font-bold text-white">
                {tPage('hero.glanceLabel')}
              </p>
            </div>

            <ul role="list" aria-labelledby={glanceId} className="mt-6 space-y-4">
              {HERO_HIGHLIGHT_IDS.map((id) => (
                <li key={id} className="flex gap-3 text-sm leading-relaxed text-white/80">
                  <Check aria-hidden="true" focusable="false" size={18} className={cn('mt-0.5 shrink-0', accent.marker)} />
                  {t(`hero.highlights.${id}`)}
                </li>
              ))}
            </ul>

            {glanceFootnote && (
              <p className="mt-6 border-t border-white/10 pt-5 text-sm font-semibold text-white/80">{glanceFootnote}</p>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}
