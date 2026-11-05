import { PRICING_CURRENCY, type ServiceDefinition } from '@/config/services';
import { getPlans, getStartingPrice, isLiveService } from '@/lib/services/catalog';
import { routing, type Locale } from '@/i18n/routing';
import { absoluteUrl, localizedPath, SITE_NAME } from './site';

/**
 * schema.org builders (JSON-LD). Each returns a plain object; render it with
 * <JsonLd />. Keep these factual: structured data must match visible content.
 */

type JsonLdObject = Record<string, unknown>;

/** One organization for the whole site, on the English (root) URL. */
const ORGANIZATION_ID = () => absoluteUrl('/#organization');

/**
 * The company: always named Misdaq, with مصداق as its other name, whichever
 * language the page is in. `description` is in the page's language.
 */
export function organizationJsonLd(description: string): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID(),
    name: SITE_NAME.en,
    alternateName: SITE_NAME.ar,
    url: absoluteUrl('/'),
    // Square, raster and well above Google's 112 px minimum: the ق mark.
    logo: { '@type': 'ImageObject', url: absoluteUrl('/icons/icon-512.png'), width: 512, height: 512 },
    description,
    areaServed: { '@type': 'Country', name: 'Saudi Arabia' },
  };
}

/** The site in one language: its home URL, name in that language, and inLanguage. */
export function websiteJsonLd(locale: Locale, url: string): JsonLdObject {
  const other = routing.locales.filter((l) => l !== locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${absoluteUrl(localizedPath(locale, '/'))}#website`,
    name: SITE_NAME[locale],
    alternateName: other.map((l) => SITE_NAME[l]),
    url,
    inLanguage: locale,
    publisher: { '@id': ORGANIZATION_ID() },
  };
}

export function serviceJsonLd(params: {
  service: ServiceDefinition;
  name: string;
  description: string;
  url: string;
  inLanguage: string;
}): JsonLdObject {
  const { service, name, description, url, inLanguage } = params;
  const priced = getPlans(service).filter((plan) => plan.pricing !== null);
  const lowPrice = getStartingPrice(service);
  const highPrice = priced.length > 0 ? Math.max(...priced.map((plan) => plan.pricing!.monthly)) : null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${url}#service`,
    name,
    description,
    url,
    inLanguage,
    serviceType: name,
    provider: { '@id': ORGANIZATION_ID() },
    areaServed: { '@type': 'Country', name: 'Saudi Arabia' },
    ...(isLiveService(service) && lowPrice !== null && highPrice !== null
      ? {
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: PRICING_CURRENCY,
            lowPrice,
            highPrice,
            offerCount: priced.length,
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function faqJsonLd(items: { question: string; answer: string }[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}
