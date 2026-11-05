import { ArrowRight, Camera, CircleCheck, Clock, MapPin, UserCheck, type LucideIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import HomeSection from './HomeSection';
import { homeSectionHref, SECTION_IDS } from './sections';

const CARD_FACTS: readonly { key: string; icon: LucideIcon }[] = [
  { key: 'photos', icon: Camera },
  { key: 'time', icon: Clock },
  { key: 'staff', icon: UserCheck },
];

export default async function AboutSection() {
  const t = await getTranslations('about');

  return (
    <HomeSection id={SECTION_IDS.about} labelledBy="about-title" className="bg-offwhite text-charcoal">
      <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 lg:grid-cols-2 lg:gap-20 lg:px-10">
        <div className="reveal">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-cyan-700">{t('label')}</p>
          <h2 id="about-title" className="text-balance text-3xl font-black leading-tight text-navy sm:text-4xl lg:text-5xl">
            {t('heading')}
          </h2>
          <p className="mt-6 text-pretty text-base leading-relaxed text-charcoal/80">{t('body1')}</p>
          <p className="mt-4 text-pretty text-base leading-relaxed text-charcoal/80">{t('body2')}</p>
          <Link
            href={homeSectionHref(SECTION_IDS.how)}
            className="mt-10 inline-flex items-center gap-2 rounded-full text-sm font-semibold text-navy underline-offset-4 transition-all hover:gap-3 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky/60 focus-visible:ring-offset-2 focus-visible:ring-offset-offwhite"
          >
            {t('cta')}
            <ArrowRight aria-hidden="true" size={16} strokeWidth={1.75} className="rtl:rotate-180" />
          </Link>
        </div>

        <RecordCardIllustration
          label={t('card.label')}
          branch={t('card.branch')}
          status={t('card.status')}
          review={t('card.review')}
          facts={CARD_FACTS.map(({ key, icon }) => ({ key, icon, text: t(`card.${key}`) }))}
        />
      </div>
    </HomeSection>
  );
}

/** Decorative mock of a verified branch record (hidden from assistive tech). */
function RecordCardIllustration({
  label,
  branch,
  status,
  review,
  facts,
}: {
  label: string;
  branch: string;
  status: string;
  review: string;
  facts: { key: string; icon: LucideIcon; text: string }[];
}) {
  return (
    <div aria-hidden="true" className="reveal relative mx-auto h-[360px] w-full max-w-[400px]">
      <div className="absolute inset-x-8 top-0 h-[200px] translate-y-[60px] rotate-[4deg] rounded-2xl border border-navy/10 bg-white shadow-[0_4px_20px_rgba(11,11,11,0.06)]" />
      <div className="absolute inset-x-4 top-6 h-[220px] -rotate-2 rounded-2xl border border-navy/10 bg-white shadow-[0_6px_24px_rgba(11,11,11,0.08)]" />

      <div className="absolute inset-x-0 top-12 rounded-[20px] border border-sky/15 bg-navy p-6 shadow-[0_24px_80px_rgba(11,11,11,0.25)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">{label}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-white">
              <MapPin size={13} className="text-sky" />
              {branch}
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-mint/25 bg-mint/15 px-3 py-1 text-xs font-semibold text-mint">
            <CircleCheck size={12} strokeWidth={2} />
            {status}
          </span>
        </div>

        <ul className="mt-5 space-y-3 border-t border-white/[0.08] pt-5">
          {facts.map(({ key, icon: Icon, text }) => (
            <li key={key} className="flex items-center gap-3 text-sm text-white/80">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky/10 text-sky">
                <Icon size={15} strokeWidth={1.75} />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>

      <div className="absolute -end-2 bottom-2 flex items-center gap-2 rounded-[14px] border border-amber-400/25 bg-navy px-4 py-3 shadow-[0_8px_24px_rgba(11,11,11,0.2)] motion-safe:animate-[float-slow_5s_ease-in-out_1s_infinite]">
        <span className="h-2 w-2 rounded-full bg-amber-400" />
        <span className="text-xs font-semibold text-amber-300">{review}</span>
      </div>
    </div>
  );
}
