import type { MetadataRoute } from 'next';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';

/** navy-deep: the page background, splash screen and browser UI colour. */
const BRAND_SURFACE = '#0d1e35';

/** Served at /manifest.webmanifest; Next.js links it from every page. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: 'seo' });

  return {
    name: t('siteName'),
    short_name: t('siteName'),
    description: t('home.description'),
    lang: routing.defaultLocale,
    start_url: '/',
    display: 'standalone',
    background_color: BRAND_SURFACE,
    theme_color: BRAND_SURFACE,
    icons: [{ src: '/logos/secondy%20logo%202.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
