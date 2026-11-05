import type { MetadataRoute } from 'next';
import { getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';

/** Misdaq Black: the page background, splash screen and browser UI colour. */
const BRAND_SURFACE = '#0B0B0B';

/**
 * Served at /manifest.webmanifest; Next.js links it from every page. It
 * describes the English site at the root (start_url "/"); Arabic pages are
 * under its scope. Brand staff apps have their own manifest per brand.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations({ locale: routing.defaultLocale, namespace: 'seo' });

  return {
    id: '/',
    name: t('siteName'),
    short_name: t('siteName'),
    description: t('home.description'),
    lang: routing.defaultLocale,
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: BRAND_SURFACE,
    theme_color: BRAND_SURFACE,
    icons: [
      { src: '/brand/mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
