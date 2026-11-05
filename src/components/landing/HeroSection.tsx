import { ArrowDown, ArrowRight, Camera, LayoutDashboard, UserCheck, type LucideIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { ButtonLink, Container } from '@/components/marketing/primitives';
import { SECTION_IDS } from './sections';

const HIGHLIGHTS: readonly { key: string; icon: LucideIcon }[] = [
  { key: 'evidence', icon: Camera },
  { key: 'accountability', icon: UserCheck },
  { key: 'dashboards', icon: LayoutDashboard },
];

/** The four corners of the proof frame, the identity's one graphic device. */
const FRAME_CORNERS = [
  'start-0 top-0 border-s-2 border-t-2',
  'end-0 top-0 border-e-2 border-t-2',
  'start-0 bottom-0 border-s-2 border-b-2',
  'end-0 bottom-0 border-e-2 border-b-2',
] as const;

/**
 * Home page hero: flat Misdaq Black with the headline inside the proof frame.
 * Text only, so the h1 is the LCP element and paints with the first bytes.
 */
export default async function HeroSection() {
  const t = await getTranslations('hero');

  return (
    <section aria-labelledby="hero-title" className="relative isolate flex min-h-svh flex-col justify-center bg-navy">
      <Container className="relative pb-20 pt-32 text-center">
        <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-1.5 text-sm font-semibold text-white/85">
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-sky" />
          {t('kicker')}
        </p>

        <div className="relative mx-auto mt-10 max-w-5xl px-6 py-10 sm:px-12 sm:py-14">
          {FRAME_CORNERS.map((corner) => (
            <span
              key={corner}
              aria-hidden="true"
              className={`absolute h-8 w-8 border-white sm:h-12 sm:w-12 ${corner}`}
            />
          ))}
          <h1
            id="hero-title"
            className="text-balance text-4xl font-bold leading-[1.1] text-white sm:text-5xl lg:text-6xl xl:text-7xl rtl:leading-[1.35]"
          >
            {t.rich('headline', {
              highlight: (chunks) => <span className="text-white/55">{chunks}</span>,
            })}
          </h1>
        </div>

        <p className="enter-fade-up mx-auto mt-8 max-w-2xl text-pretty text-base leading-relaxed text-white/70 sm:text-lg">
          {t('subheading')}
        </p>

        <div className="enter-fade-up enter-delay-1 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <ButtonLink href={`#${SECTION_IDS.services}`} size="lg">
            {t('ctaPrimary')}
            <ArrowDown aria-hidden="true" size={18} strokeWidth={1.75} />
          </ButtonLink>
          <ButtonLink href="/apply" variant="secondary" size="lg">
            {t('ctaSecondary')}
            <ArrowRight aria-hidden="true" size={18} strokeWidth={1.75} className="rtl:rotate-180" />
          </ButtonLink>
        </div>

        <ul className="enter-fade-up enter-delay-2 mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {HIGHLIGHTS.map(({ key, icon: Icon }) => (
            <li key={key} className="flex items-center gap-2 text-sm font-medium text-white/70">
              <Icon aria-hidden="true" size={16} strokeWidth={1.75} className="shrink-0 text-white" />
              {t(`highlights.${key}`)}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
