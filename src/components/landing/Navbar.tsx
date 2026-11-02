import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { ButtonLink, Container } from '@/components/marketing/primitives';
import { Link } from '@/i18n/navigation';
import HeaderFrame from './HeaderFrame';
import LanguageLinks from './LanguageLinks';
import MobileMenu from './MobileMenu';
import { homeSectionHref, NAV_SECTIONS } from './sections';

const LOGO_MARK = '/logos/secondy logo 2.svg';

const LANGUAGE_PILL =
  'inline-flex h-9 items-center rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-xs font-bold text-white/75 transition-colors hover:border-sky/40 hover:text-sky focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky/60';

/**
 * Site header for the public pages: a server-rendered shell with three small
 * client islands (scroll backdrop, mobile drawer, language switch). Copy is
 * passed to the islands as props, so no message catalogue ships to the client.
 */
export default async function Navbar() {
  const [t, tMarketing] = await Promise.all([getTranslations('nav'), getTranslations('marketing')]);

  const links = NAV_SECTIONS.map((section) => ({
    id: section.id,
    href: homeSectionHref(section.id),
    label: t(section.labelKey),
  }));

  return (
    <>
      {/* A plain fragment link on purpose: native in-page navigation moves keyboard focus to <main>. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-white focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-navy focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky"
      >
        {tMarketing('skipToContent')}
      </a>

      <HeaderFrame>
        <Container className="flex h-16 items-center justify-between gap-6">
          <Link
            href="/"
            aria-label={t('home')}
            className="group rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky/60"
          >
            <Image
              src={LOGO_MARK}
              alt=""
              width={40}
              height={40}
              loading="eager"
              className="transition-transform duration-300 group-hover:scale-110"
            />
          </Link>

          <nav aria-label={t('primaryNav')} className="hidden md:block">
            <ul className="flex items-center gap-1">
              {links.map((link) => (
                <li key={link.id}>
                  <Link
                    href={link.href}
                    className="group relative block rounded-full px-4 py-2 text-sm font-medium text-white/75 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky/60"
                  >
                    {link.label}
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-4 bottom-0.5 h-px origin-center scale-x-0 bg-gradient-cta transition-transform duration-200 group-hover:scale-x-100"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <LanguageLinks className={LANGUAGE_PILL} />
            <ButtonLink href="/apply">{tMarketing('getStarted')}</ButtonLink>
          </div>

          <MobileMenu
            className="md:hidden"
            label={t('menu')}
            openLabel={t('openMenu')}
            closeLabel={t('closeMenu')}
            header={<Image src={LOGO_MARK} alt="" width={32} height={32} />}
          >
            <nav aria-label={t('primaryNav')}>
              <ul className="flex flex-col gap-1">
                {links.map((link) => (
                  <li key={link.id}>
                    <Link
                      href={link.href}
                      className="block rounded-xl px-4 py-3 text-base font-medium text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky/60"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mt-auto flex flex-col gap-3 pt-8">
              <LanguageLinks className={`${LANGUAGE_PILL} justify-center`} />
              <ButtonLink href="/apply" size="lg">
                {tMarketing('getStarted')}
              </ButtonLink>
            </div>
          </MobileMenu>
        </Container>
      </HeaderFrame>
    </>
  );
}
