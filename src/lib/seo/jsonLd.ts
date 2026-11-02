import { PRICING_CURRENCY, type ServiceDefinition } from '@/config/services';
import { getPlans, getStartingPrice, isLiveService } from '@/lib/services/catalog';
import { absoluteUrl } from './site';

/**
 * schema.org builders (JSON-LD). Each returns a plain object; render it with
 * <JsonLd />. Keep these factual: structured data must match visible content.
 */

type JsonLdObject = Record<string, unknown>;

const ORGANIZATION_ID = () => absoluteUrl('/#organization');
const WEBSITE_ID = () => absoluteUrl('/#website');

export function organizationJsonLd(name: string, description: string): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID(),
    name,
    url: absoluteUrl('/'),
    logo: absoluteUrl('/logos/primary%20logo.svg'),
    description,
    areaServed: { '@type': 'Country', name: 'Saudi Arabia' },
  };
}

export function websiteJsonLd(name: string, inLanguage: string, url: string): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID(),
    name,
    url,
    inLanguage,
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
