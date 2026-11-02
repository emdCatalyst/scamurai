import { getTranslations } from 'next-intl/server';
import type { ServiceDefinition } from '@/config/services';
import { cn } from '@/lib/cn';
import { isLiveService } from '@/lib/services/catalog';
import { ACCENTS } from '../accents';
import { Container, Section, SectionHeading } from '../primitives';
import { PAGE_NAMESPACE, STEP_IDS, serviceNamespace } from './content';
import PlannedNote from './PlannedNote';

/** "How it works" (or "How it will work" for coming-soon services) as numbered steps. */
export default async function ServiceSteps({ service }: { service: ServiceDefinition }) {
  const [t, tPage] = await Promise.all([
    getTranslations(serviceNamespace(service.key)),
    getTranslations(PAGE_NAMESPACE),
  ]);
  const accent = ACCENTS[service.accent];
  const headingId = `${service.key}-steps-heading`;

  return (
    <Section id="how-it-works" labelledBy={headingId} tone="deep" className="scroll-mt-16">
      <Container>
        <SectionHeading
          id={headingId}
          eyebrow={tPage(`steps.eyebrow.${service.status}`)}
          title={t('steps.title')}
          description={t('steps.description')}
        />

        <ol role="list" className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEP_IDS.map((id, index) => (
            <li key={id} className="reveal rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border text-sm font-black tabular-nums',
                  accent.border,
                  accent.soft,
                  accent.text
                )}
              >
                {index + 1}
              </span>
              <h3 className="mt-5 text-lg font-bold text-white">{t(`steps.items.${id}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{t(`steps.items.${id}.description`)}</p>
            </li>
          ))}
        </ol>

        {!isLiveService(service) && <PlannedNote>{tPage('steps.plannedNote')}</PlannedNote>}
      </Container>
    </Section>
  );
}
