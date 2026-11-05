import { getTranslations } from 'next-intl/server';
import type { ServiceDefinition } from '@/config/services';
import { isLiveService } from '@/lib/services/catalog';
import { Container, Section, SectionHeading } from '../primitives';
import { FEATURE_IDS, PAGE_NAMESPACE, serviceNamespace } from './content';
import { FEATURE_ICONS } from './featureIcons';
import PlannedNote from './PlannedNote';

/** Feature grid; for coming-soon services it presents the planned early-access scope. */
export default async function ServiceFeatures({ service }: { service: ServiceDefinition }) {
  const [t, tPage] = await Promise.all([
    getTranslations(serviceNamespace(service.key)),
    getTranslations(PAGE_NAMESPACE),
  ]);
  const icons = FEATURE_ICONS[service.key];
  const headingId = `${service.key}-features-heading`;

  return (
    <Section id="features" labelledBy={headingId} className="scroll-mt-16">
      <Container>
        <SectionHeading
          id={headingId}
          eyebrow={tPage(`features.eyebrow.${service.status}`)}
          title={t('features.title')}
          description={t('features.description')}
        />

        <ul role="list" className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_IDS.map((id) => {
            const Icon = icons[id];
            return (
              <li key={id} className="reveal rounded-[28px] border border-white/10 bg-charcoal p-7">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.06] text-white"
                >
                  <Icon aria-hidden="true" focusable="false" size={22} strokeWidth={1.75} />
                </span>
                <h3 className="mt-5 text-lg font-bold text-white">{t(`features.items.${id}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{t(`features.items.${id}.description`)}</p>
              </li>
            );
          })}
        </ul>

        {!isLiveService(service) && <PlannedNote>{tPage('features.plannedNote')}</PlannedNote>}
      </Container>
    </Section>
  );
}
