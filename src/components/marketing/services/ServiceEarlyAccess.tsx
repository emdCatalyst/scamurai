import { Check } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ComingSoonService } from '@/config/services';
import { cn } from '@/lib/cn';
import { ACCENTS } from '../accents';
import { Container, Section, SectionHeading } from '../primitives';
import ApplyButton from './ApplyButton';
import { EARLY_ACCESS_POINT_IDS, PAGE_NAMESPACE, serviceNamespace } from './content';

/**
 * Takes the place of pricing for a coming-soon service: explains early access
 * (no prices, no payment now) and invites the visitor to register interest.
 */
export default async function ServiceEarlyAccess({ service }: { service: ComingSoonService }) {
  const [t, tPage] = await Promise.all([
    getTranslations(serviceNamespace(service.key)),
    getTranslations(PAGE_NAMESPACE),
  ]);
  const accent = ACCENTS[service.accent];
  const headingId = `${service.key}-early-access-heading`;
  const name = t('name');

  return (
    <Section id="early-access" labelledBy={headingId} tone="deep" className="scroll-mt-16">
      <Container>
        <div
          className={cn(
            'mx-auto max-w-5xl rounded-[28px] border bg-charcoal px-6 py-12 sm:px-12 sm:py-16',
            accent.border
          )}
        >
          <SectionHeading
            id={headingId}
            eyebrow={tPage('earlyAccess.eyebrow')}
            title={tPage('earlyAccess.title', { name })}
            description={tPage('earlyAccess.description', { name })}
          />

          <ul role="list" className="mt-10 grid gap-4 md:grid-cols-3">
            {EARLY_ACCESS_POINT_IDS.map((id) => (
              <li
                key={id}
                className="flex gap-3 rounded-[20px] border border-white/10 bg-navy p-5 text-sm leading-relaxed text-white/80"
              >
                <Check aria-hidden="true" focusable="false" size={18} className={cn('mt-0.5 shrink-0', accent.marker)} />
                {tPage(`earlyAccess.points.${id}`)}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex justify-center">
            <ApplyButton service={service} />
          </div>
        </div>
      </Container>
    </Section>
  );
}
