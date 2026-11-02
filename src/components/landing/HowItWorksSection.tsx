import { LayoutGrid, ListChecks, MessagesSquare, Palette, type LucideIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Container, SectionHeading } from '@/components/marketing/primitives';
import HomeSection from './HomeSection';
import { SECTION_IDS } from './sections';

/** The customer journey, in order. Copy lives in `howItWorks.steps.<key>`. */
const STEPS: readonly { key: string; icon: LucideIcon }[] = [
  { key: 'service', icon: LayoutGrid },
  { key: 'plan', icon: ListChecks },
  { key: 'contact', icon: MessagesSquare },
  { key: 'activate', icon: Palette },
];

export default async function HowItWorksSection() {
  const t = await getTranslations('howItWorks');

  return (
    <HomeSection id={SECTION_IDS.how} labelledBy="how-title" tone="deep">
      <Container>
        <SectionHeading
          id="how-title"
          eyebrow={t('label')}
          title={t('heading')}
          description={t('description')}
          className="reveal"
        />

        <div className="relative mt-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-[12.5%] top-14 hidden h-px bg-gradient-to-r from-sky/30 to-mint/30 lg:block"
          />
          <ol className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {STEPS.map(({ key, icon: Icon }, index) => (
              <li key={key} className="reveal relative flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="h-28 w-28 rounded-full border border-sky/15 bg-[radial-gradient(circle,rgba(79,197,223,0.08)_0%,transparent_70%)]" />
                  <div className="absolute inset-4 flex items-center justify-center rounded-full border border-sky/20 bg-navy-deep">
                    <Icon aria-hidden="true" size={28} strokeWidth={1.5} className="text-sky" />
                  </div>
                  <span
                    aria-hidden="true"
                    className="absolute -end-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-cta text-sm font-black text-navy"
                  >
                    {index + 1}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">{t(`steps.${key}.title`)}</h3>
                <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-white/70">
                  {t(`steps.${key}.description`)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </HomeSection>
  );
}
