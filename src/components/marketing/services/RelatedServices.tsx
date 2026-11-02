import { getLocale, getTranslations } from 'next-intl/server';
import type { ServiceDefinition } from '@/config/services';
import { cn } from '@/lib/cn';
import { getStartingPrice, listServices } from '@/lib/services/catalog';
import { Container, Section, SectionHeading } from '../primitives';
import ServiceCard from '../ServiceCard';
import { PAGE_NAMESPACE } from './content';
import { formatAmount } from './pricing';

/** Cards for every other service in the catalog, in display order. */
export default async function RelatedServices({ service }: { service: ServiceDefinition }) {
  const others = listServices().filter((other) => other.key !== service.key);
  if (others.length === 0) return null;

  const [locale, t, tPage, tMarketing] = await Promise.all([
    getLocale(),
    getTranslations('services'),
    getTranslations(PAGE_NAMESPACE),
    getTranslations('marketing'),
  ]);
  const headingId = `${service.key}-related-heading`;

  return (
    <Section labelledBy={headingId} tone="navy">
      <Container>
        <SectionHeading id={headingId} eyebrow={tPage('related.eyebrow')} title={tPage('related.title')} />

        <ul role="list" className={cn('mt-12 grid gap-6 md:grid-cols-2', others.length > 2 && 'lg:grid-cols-3')}>
          {others.map((other) => {
            const startingPrice = getStartingPrice(other);
            return (
              <li key={other.key} className="reveal">
                <ServiceCard
                  service={other}
                  name={t(`${other.key}.name`)}
                  tagline={t(`${other.key}.tagline`)}
                  summary={t(`${other.key}.summary`)}
                  statusLabel={tMarketing(`status.${other.status}`)}
                  ctaLabel={tMarketing('learnMore')}
                  priceLabel={
                    startingPrice === null
                      ? undefined
                      : tMarketing('startingFrom', { price: formatAmount(locale, startingPrice) })
                  }
                />
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}
