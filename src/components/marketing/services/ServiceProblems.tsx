import { CircleCheck, CircleX } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ServiceDefinition } from '@/config/services';
import { cn } from '@/lib/cn';
import { ACCENTS } from '../accents';
import { Container, Section, SectionHeading } from '../primitives';
import { PAGE_NAMESPACE, PROBLEM_IDS, serviceNamespace } from './content';

/** The pains a service removes, each paired with how the service solves it. */
export default async function ServiceProblems({ service }: { service: ServiceDefinition }) {
  const [t, tPage] = await Promise.all([
    getTranslations(serviceNamespace(service.key)),
    getTranslations(PAGE_NAMESPACE),
  ]);
  const accent = ACCENTS[service.accent];
  const headingId = `${service.key}-problems-heading`;
  const solutionLabel = tPage('problems.solutionLabel', { name: t('name') });

  return (
    <Section labelledBy={headingId}>
      <Container>
        <SectionHeading
          id={headingId}
          eyebrow={tPage('problems.eyebrow')}
          title={t('problems.title')}
          description={t('problems.description')}
        />

        <ul role="list" className="mt-14 grid gap-6 lg:grid-cols-3">
          {PROBLEM_IDS.map((id) => (
            <li
              key={id}
              className="reveal flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]"
            >
              <div className="flex-1 p-6">
                <p className="flex items-center gap-2 text-xs font-bold text-white/65">
                  <CircleX aria-hidden="true" focusable="false" size={16} className="shrink-0 text-rose-300" />
                  {tPage('problems.problemLabel')}
                </p>
                <p className="mt-3 leading-relaxed text-white/80">{t(`problems.items.${id}.problem`)}</p>
              </div>
              <div className={cn('flex-1 border-t p-6', accent.border, accent.soft)}>
                <p className={cn('flex items-center gap-2 text-xs font-bold', accent.text)}>
                  <CircleCheck aria-hidden="true" focusable="false" size={16} className="shrink-0" />
                  {solutionLabel}
                </p>
                <p className="mt-3 leading-relaxed text-white">{t(`problems.items.${id}.solution`)}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}
