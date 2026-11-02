import { getTranslations } from 'next-intl/server';
import type { LiveService } from '@/config/services';
import { getMaxAnnualDiscountPercent, getPlans } from '@/lib/services/catalog';
import { Container, Section, SectionHeading } from '../primitives';
import BillingToggle from './BillingToggle';
import { serviceNamespace } from './content';
import PlanCard from './PlanCard';

/**
 * Plans and prices of a live service, read from the catalog only. The billing
 * switch is pure CSS (see <BillingToggle>), so this section ships no
 * JavaScript and both prices of every plan are in the HTML.
 */
export default async function ServicePricing({ service }: { service: LiveService }) {
  const [t, tService] = await Promise.all([
    getTranslations('plans'),
    getTranslations(serviceNamespace(service.key)),
  ]);
  const headingId = `${service.key}-pricing-heading`;

  return (
    <Section id="pricing" labelledBy={headingId} tone="deep" className="scroll-mt-16">
      <Container>
        <SectionHeading
          id={headingId}
          eyebrow={t('label')}
          title={t('titleFor', { name: tService('name') })}
          description={t('description')}
        />

        <div className="group/pricing mt-10">
          <BillingToggle name={`${service.key}-billing`} discountPercent={getMaxAnnualDiscountPercent(service)} />
          <ul role="list" className="mt-12 grid gap-6 lg:grid-cols-3">
            {getPlans(service).map((plan) => (
              <PlanCard key={plan.tier} service={service} plan={plan} />
            ))}
          </ul>
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm leading-relaxed text-white/65">{t('pricingNote')}</p>
      </Container>
    </Section>
  );
}
