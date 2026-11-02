import { getLocale, getTranslations } from 'next-intl/server';
import { Container, SectionHeading } from '@/components/marketing/primitives';
import ServiceCard from '@/components/marketing/ServiceCard';
import { formatAmount } from '@/components/marketing/services/pricing';
import { getStartingPrice, isLiveService, listServices } from '@/lib/services/catalog';
import HomeSection from './HomeSection';
import { SECTION_IDS } from './sections';

/**
 * The service catalog on the home page. Fully data-driven: a service added to
 * src/config/services.ts (with its copy in `services.json`) appears here with
 * no code change. Prices come from the catalog and are only shown for live
 * services; coming-soon services invite visitors to register interest.
 */
export default async function ServicesSection() {
  const [locale, t, tServices, tMarketing] = await Promise.all([
    getLocale(),
    getTranslations('hero.services'),
    getTranslations('services'),
    getTranslations('marketing'),
  ]);

  return (
    <HomeSection id={SECTION_IDS.services} labelledBy="services-title" tone="deep">
      <Container>
        <SectionHeading
          id="services-title"
          eyebrow={t('label')}
          title={t('heading')}
          description={t('description')}
          className="reveal"
        />

        <ul className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {listServices().map((service) => {
            const startingPrice = getStartingPrice(service);
            return (
              <li key={service.key} className="reveal">
                <ServiceCard
                  service={service}
                  name={tServices(`${service.key}.name`)}
                  tagline={tServices(`${service.key}.tagline`)}
                  summary={tServices(`${service.key}.summary`)}
                  statusLabel={tMarketing(`status.${service.status}`)}
                  ctaLabel={isLiveService(service) ? tMarketing('learnMore') : tMarketing('registerInterest')}
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
    </HomeSection>
  );
}
