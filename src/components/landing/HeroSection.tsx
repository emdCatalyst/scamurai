import { ArrowDown, ArrowRight, Camera, LayoutDashboard, UserCheck, type LucideIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { ButtonLink, Container } from '@/components/marketing/primitives';
import HeroBackdrop from './HeroBackdrop';
import { SECTION_IDS } from './sections';

const HIGHLIGHTS: readonly { key: string; icon: LucideIcon }[] = [
  { key: 'evidence', icon: Camera },
  { key: 'accountability', icon: UserCheck },
  { key: 'dashboards', icon: LayoutDashboard },
];

/**
 * Home page hero. The kicker sits inside the speech bubble drawn into the
 * tower art, so its box is positioned in CSS pixels that match the artwork
 * (the bubble spans y = 390–480 of the 1920×1080 image).
 */
export default async function HeroSection() {
  const t = await getTranslations('hero');

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-svh flex-col overflow-hidden bg-[linear-gradient(160deg,#060f1a_0%,#0d1e35_40%,#091826_100%)]"
    >
      <HeroBackdrop />

      <Container className="relative pb-24 pt-[390px] text-center">
        <p className="mx-auto flex h-[90px] items-center justify-center whitespace-nowrap text-3xl font-bold text-navy">
          {t('kicker')}
        </p>

        <h1
          id="hero-title"
          className="mx-auto mt-8 max-w-4xl text-balance text-4xl font-black leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-7xl rtl:leading-[1.3] rtl:tracking-normal"
        >
          {t.rich('headline', {
            highlight: (chunks) => <span className="text-gradient-sky">{chunks}</span>,
          })}
        </h1>

        <p className="enter-fade-up mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-white/70 sm:text-lg">
          {t('subheading')}
        </p>

        <div className="enter-fade-up enter-delay-1 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <ButtonLink href={`#${SECTION_IDS.services}`} size="lg">
            {t('ctaPrimary')}
            <ArrowDown aria-hidden="true" size={18} strokeWidth={2} />
          </ButtonLink>
          <ButtonLink href="/apply" variant="secondary" size="lg">
            {t('ctaSecondary')}
            <ArrowRight aria-hidden="true" size={18} strokeWidth={2} className="rtl:rotate-180" />
          </ButtonLink>
        </div>

        <ul className="enter-fade-up enter-delay-2 mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {HIGHLIGHTS.map(({ key, icon: Icon }) => (
            <li key={key} className="flex items-center gap-2 text-sm font-medium text-white/70">
              <Icon aria-hidden="true" size={16} strokeWidth={1.75} className="shrink-0 text-sky" />
              {t(`highlights.${key}`)}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
