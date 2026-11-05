import { afterEach, describe, expect, it, vi } from 'vitest';
import { organizationJsonLd, websiteJsonLd } from './jsonLd';
import { buildAlternates, fullTitle, getAppUrl, getSiteUrl, pageMetadata, shareImage } from './site';

const SITE = 'https://misdaq.example';

afterEach(() => vi.unstubAllEnvs());

describe('site URL', () => {
  it('falls back to https://misdaq.sa.com, never localhost or an old domain', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubEnv('APP_URL', '');
    expect(getSiteUrl().toString()).toBe('https://misdaq.sa.com/');
    expect(getAppUrl()).toBe('https://misdaq.sa.com');
  });

  it('prefers NEXT_PUBLIC_SITE_URL for SEO and APP_URL for app links', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', SITE);
    vi.stubEnv('APP_URL', 'https://staging.misdaq.example/');
    expect(getSiteUrl().toString()).toBe(`${SITE}/`);
    expect(getAppUrl()).toBe('https://staging.misdaq.example');
  });
});

describe('page metadata', () => {
  it('titles pages "Page — Misdaq" and "الصفحة — مصداق"', () => {
    expect(fullTitle('en', 'Get started')).toBe('Get started — Misdaq');
    expect(fullTitle('ar', 'ابدأ الآن')).toBe('ابدأ الآن — مصداق');
  });

  it('gives absolute, self-referencing canonicals and hreflang on the new URLs', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', SITE);
    const languages = {
      en: `${SITE}/services/order-protection`,
      ar: `${SITE}/ar/services/order-protection`,
      'x-default': `${SITE}/services/order-protection`,
    };
    expect(buildAlternates('en', '/services/order-protection')).toEqual({ canonical: languages.en, languages });
    expect(buildAlternates('ar', '/services/order-protection')).toEqual({ canonical: languages.ar, languages });

    const home = buildAlternates('en', '/');
    expect(home.canonical).toBe(`${SITE}/`);
    expect(buildAlternates('ar', '/').canonical).toBe(`${SITE}/ar`);
    expect(JSON.stringify(home)).not.toContain('/en');
  });

  it('builds Open Graph and X cards whose URL is the canonical, per language', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', SITE);
    const metadata = pageMetadata({ locale: 'ar', path: '/apply', title: 'ابدأ الآن', description: 'وصف' });

    expect(metadata.title).toEqual({ absolute: 'ابدأ الآن — مصداق' });
    expect(metadata.alternates?.canonical).toBe(`${SITE}/ar/apply`);
    expect(metadata.openGraph).toMatchObject({
      url: `${SITE}/ar/apply`,
      siteName: 'مصداق',
      locale: 'ar_SA',
      alternateLocale: ['en_US'],
      title: 'ابدأ الآن — مصداق',
      images: [shareImage('ar')],
    });
    expect(shareImage('ar').url).toBe(`${SITE}/og/misdaq-ar.png`);
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image', images: [shareImage('ar')] });

    const english = pageMetadata({ locale: 'en', path: '/', title: 'Misdaq — value', description: 'd', brandedTitle: true });
    expect(english.title).toEqual({ absolute: 'Misdaq — value' });
    expect(english.openGraph).toMatchObject({ siteName: 'Misdaq', locale: 'en_US', url: `${SITE}/` });
  });
});

describe('JSON-LD', () => {
  it('names the organization Misdaq with مصداق as its other name, on absolute URLs', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', SITE);
    const organization = organizationJsonLd('description');
    expect(organization).toMatchObject({ '@type': 'Organization', name: 'Misdaq', alternateName: 'مصداق', url: `${SITE}/` });
    expect(JSON.parse(JSON.stringify(organization))).toEqual(organization);

    expect(websiteJsonLd('ar', `${SITE}/ar`)).toMatchObject({
      '@type': 'WebSite',
      '@id': `${SITE}/ar#website`,
      name: 'مصداق',
      inLanguage: 'ar',
      url: `${SITE}/ar`,
    });
    expect(websiteJsonLd('en', `${SITE}/`)).toMatchObject({ '@id': `${SITE}/#website`, name: 'Misdaq', inLanguage: 'en' });
  });
});
