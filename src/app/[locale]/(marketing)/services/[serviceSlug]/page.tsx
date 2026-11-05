import type { Metadata } from 'next';
import { hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { getServiceBySlug, isLiveService, listServices } from '@/lib/services/catalog';
import { breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from '@/lib/seo/jsonLd';
import { absoluteUrl, localizedPath, pageMetadata } from '@/lib/seo/site';
import JsonLd from '@/components/seo/JsonLd';
import Breadcrumbs, { breadcrumbUrl, type BreadcrumbItem } from '@/components/marketing/services/Breadcrumbs';
import { PAGE_NAMESPACE, serviceNamespace } from '@/components/marketing/services/content';
import { getServiceFaq } from '@/components/marketing/services/faq';
import { getServicePath } from '@/components/marketing/services/links';
import RelatedServices from '@/components/marketing/services/RelatedServices';
import ServiceCtaBand from '@/components/marketing/services/ServiceCtaBand';
import ServiceEarlyAccess from '@/components/marketing/services/ServiceEarlyAccess';
import ServiceFaq from '@/components/marketing/services/ServiceFaq';
import ServiceFeatures from '@/components/marketing/services/ServiceFeatures';
import ServiceHero from '@/components/marketing/services/ServiceHero';
import ServicePricing from '@/components/marketing/services/ServicePricing';
import ServiceProblems from '@/components/marketing/services/ServiceProblems';
import ServiceSteps from '@/components/marketing/services/ServiceSteps';

type Params = Promise<{ locale: string; serviceSlug: string }>;

/**
 * One statically generated page per catalog service and locale. Everything is
 * data-driven: adding a service to the catalog (plus its copy) adds its page.
 *
 * Unknown slugs are not blocked with `dynamicParams = false`: that answers
 * with the root 404 outside the [locale] layout (no <html lang>). Instead
 * resolveParams calls notFound(), which renders the localized 404 in-layout.
 */
export function generateStaticParams() {
  return listServices().map((service) => ({ serviceSlug: service.slug }));
}

async function resolveParams(params: Params) {
  const { locale, serviceSlug } = await params;
  const service = getServiceBySlug(serviceSlug);
  if (!hasLocale(routing.locales, locale) || !service) notFound();
  return { locale, service };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { locale, service } = await resolveParams(params);
  const t = await getTranslations({ locale, namespace: serviceNamespace(service.key) });

  return pageMetadata({
    locale,
    path: getServicePath(service),
    title: t('seo.title'),
    description: t('seo.description'),
  });
}

export default async function ServicePage({ params }: { params: Params }) {
  const { locale, service } = await resolveParams(params);
  setRequestLocale(locale);

  const [t, tPage, tMarketing, faq] = await Promise.all([
    getTranslations(serviceNamespace(service.key)),
    getTranslations(PAGE_NAMESPACE),
    getTranslations('marketing'),
    getServiceFaq(service),
  ]);
  const name = t('name');
  const path = getServicePath(service);
  const breadcrumbs: BreadcrumbItem[] = [
    { label: tMarketing('breadcrumbHome'), path: '/' },
    { label: tMarketing('breadcrumbServices'), path: '/', hash: 'services' },
    { label: name, path },
  ];

  return (
    <main id="main">
      <JsonLd
        data={[
          serviceJsonLd({
            service,
            name,
            description: t('summary'),
            url: absoluteUrl(localizedPath(locale, path)),
            inLanguage: locale,
          }),
          breadcrumbJsonLd(breadcrumbs.map((item) => ({ name: item.label, url: breadcrumbUrl(locale, item) }))),
          faqJsonLd(faq),
        ]}
      />

      <ServiceHero
        service={service}
        breadcrumbs={<Breadcrumbs label={tPage('breadcrumbLabel')} items={breadcrumbs} />}
      />
      <ServiceProblems service={service} />
      <ServiceSteps service={service} />
      <ServiceFeatures service={service} />
      {isLiveService(service) ? <ServicePricing service={service} /> : <ServiceEarlyAccess service={service} />}
      <ServiceFaq service={service} />
      <RelatedServices service={service} />
      <ServiceCtaBand service={service} />
    </main>
  );
}
