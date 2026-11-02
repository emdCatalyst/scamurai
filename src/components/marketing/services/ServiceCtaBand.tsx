import { getTranslations } from 'next-intl/server';
import type { ServiceDefinition } from '@/config/services';
import { cn } from '@/lib/cn';
import { ACCENTS } from '../accents';
import { Container, Section, SectionHeading } from '../primitives';
import AccentGlow from './AccentGlow';
import ApplyButton from './ApplyButton';
import { serviceNamespace } from './content';

/** Closing call to action of a service page. */
export default async function ServiceCtaBand({ service }: { service: ServiceDefinition }) {
  const t = await getTranslations(serviceNamespace(service.key));
  const headingId = `${service.key}-cta-heading`;

  return (
    <Section labelledBy={headingId}>
      <Container>
        <div
          className={cn(
            'relative overflow-hidden rounded-3xl border bg-white/[0.04] px-6 py-14 sm:px-12 sm:py-20',
            ACCENTS[service.accent].border
          )}
        >
          <AccentGlow accent={service.accent} className="-top-32" />
          <div className="relative">
            <SectionHeading id={headingId} title={t('cta.title')} description={t('cta.description')} />
            <div className="mt-10 flex justify-center">
              <ApplyButton service={service} />
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
