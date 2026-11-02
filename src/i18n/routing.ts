import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  // hreflang comes from page metadata and sitemap.xml (absolute, with an
  // x-default that doesn't redirect). The middleware's Link header would add a
  // second, conflicting set, so it is turned off.
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];
