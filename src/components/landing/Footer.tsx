import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { getServicePath } from '@/components/marketing/services/links';
import { ButtonLink, Container } from '@/components/marketing/primitives';
import { Link } from '@/i18n/navigation';
import { isLiveService, listServices } from '@/lib/services/catalog';
import LanguageLinks from './LanguageLinks';
import { homeSectionHref, SECTION_IDS } from './sections';

const LINK = 'rounded text-sm text-white/65 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky/60';
const COLUMN_HEADING = 'mb-5 text-xs font-bold uppercase tracking-widest text-white/65 rtl:tracking-normal';

/** Rendered when the page is built, so the static footer always shows the current year. */
const BUILD_YEAR = String(new Date().getFullYear());

/** Site footer for the public pages. Server component: no client JavaScript besides the language switch. */
export default async function Footer() {
  const [t, tNav, tServices, tMarketing, tSeo] = await Promise.all([
    getTranslations('footer'),
    getTranslations('nav'),
    getTranslations('services'),
    getTranslations('marketing'),
    getTranslations('seo'),
  ]);

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.06] bg-[linear-gradient(180deg,#0a1625_0%,#060e1a_100%)]">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky/20 to-transparent"
      />

      <Container className="relative py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.3fr]">
          <div className="flex flex-col gap-5">
            <Link
              href="/"
              className="flex w-fit items-center gap-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky/60"
            >
              <Image src="/logos/secondy logo 2.svg" alt="" width={38} height={38} className="opacity-90" />
              <Image src="/logos/primary logo 2.svg" alt={tSeo('siteName')} width={100} height={29} className="opacity-90" />
            </Link>
            <p className="text-sm font-semibold text-white/85">{t('tagline')}</p>
            <p className="max-w-xs text-sm leading-relaxed text-white/65">{t('description')}</p>
          </div>

          <nav aria-labelledby="footer-services">
            <h2 id="footer-services" className={COLUMN_HEADING}>
              {t('servicesHeading')}
            </h2>
            <ul className="flex flex-col gap-3">
              {listServices().map((service) => (
                <li key={service.key} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link href={getServicePath(service)} className={LINK}>
                    {tServices(`${service.key}.name`)}
                  </Link>
                  {!isLiveService(service) && (
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-medium text-white/65">
                      {tMarketing(`status.${service.status}`)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-explore">
            <h2 id="footer-explore" className={COLUMN_HEADING}>
              {t('exploreHeading')}
            </h2>
            <ul className="flex flex-col gap-3">
              <li>
                <Link href={homeSectionHref(SECTION_IDS.how)} className={LINK}>
                  {tNav('howItWorks')}
                </Link>
              </li>
              <li>
                <Link href={homeSectionHref(SECTION_IDS.about)} className={LINK}>
                  {tNav('about')}
                </Link>
              </li>
              <li>
                <Link href="/apply" className={LINK}>
                  {tMarketing('getStarted')}
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className="text-base font-bold text-white">{t('ctaHeading')}</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/65">{t('ctaBody')}</p>
            <ButtonLink href="/apply" className="mt-6">
              {tMarketing('getStarted')}
            </ButtonLink>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row">
          <p className="text-xs text-white/65">{t('copyright', { year: BUILD_YEAR })}</p>
          <LanguageLinks className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/75 transition-colors hover:border-sky/40 hover:text-sky focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky/60" />
        </div>
      </Container>
    </footer>
  );
}
