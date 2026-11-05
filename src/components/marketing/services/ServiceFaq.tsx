import { ChevronDown } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ServiceDefinition } from '@/config/services';
import { cn } from '@/lib/cn';
import { ACCENTS } from '../accents';
import { Container, Section, SectionHeading } from '../primitives';
import { PAGE_NAMESPACE, serviceNamespace } from './content';
import { getServiceFaq } from './faq';

/**
 * Accordion built on native <details>/<summary>: keyboard and screen-reader
 * support for free, zero JavaScript, and find-in-page can open answers.
 */
export default async function ServiceFaq({ service }: { service: ServiceDefinition }) {
  const [items, t, tPage] = await Promise.all([
    getServiceFaq(service),
    getTranslations(serviceNamespace(service.key)),
    getTranslations(PAGE_NAMESPACE),
  ]);
  const accent = ACCENTS[service.accent];
  const headingId = `${service.key}-faq-heading`;

  return (
    <Section id="faq" labelledBy={headingId} className="scroll-mt-16">
      <Container className="max-w-4xl">
        <SectionHeading id={headingId} eyebrow={tPage('faq.eyebrow')} title={tPage('faq.title', { name: t('name') })} />

        <div className="mt-12 space-y-3">
          {items.map((item) => (
            <details
              key={item.question}
              className="reveal group rounded-[20px] border border-white/10 bg-charcoal transition-colors open:border-white/20"
            >
              <summary
                className={cn(
                  'flex cursor-pointer list-none items-center justify-between gap-6 rounded-[20px] px-6 py-5 text-start font-semibold text-white',
                  'focus-visible:outline-none focus-visible:ring-2 [&::-webkit-details-marker]:hidden',
                  accent.ring
                )}
              >
                {item.question}
                <ChevronDown
                  aria-hidden="true"
                  focusable="false"
                  size={20}
                  className="shrink-0 text-white/60 transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <p className="px-6 pb-6 leading-relaxed text-white/70">{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  );
}
