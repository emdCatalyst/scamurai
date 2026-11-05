import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/i18n/routing';
import { pageMetadata } from '@/lib/seo/site';
import ClientIntlProvider from '@/components/providers/ClientIntlProvider';
import { Container } from '@/components/marketing/primitives';
import ApplicationForm from '@/components/onboarding/ApplicationForm';
import ApplyFormSkeleton from '@/components/apply/ApplyFormSkeleton';
import ApplyIntro from '@/components/apply/ApplyIntro';
import { APPLY_FORM_NAMESPACES, selectServiceSummaries } from '@/components/apply/namespaces';

const HEADING_ID = 'apply-heading';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as Locale, namespace: 'seo' });

  // Preselection query strings (?service=…&plan=…) all canonicalise to /apply.
  return pageMetadata({
    locale: locale as Locale,
    path: '/apply',
    title: t('apply.title'),
    description: t('apply.description'),
  });
}

/**
 * Application page. Static: the heading is server-rendered (it is the LCP)
 * and the form, which reads the query string, renders in the browser behind
 * a same-size skeleton.
 */
export default async function ApplyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations('apply');

  return (
    <main
      id="main"
      className="relative isolate overflow-hidden bg-navy pb-24 pt-28 sm:pb-32 sm:pt-36"
    >
      <Container className="max-w-4xl">
        <ApplyIntro headingId={HEADING_ID} />
        <div className="mt-10 sm:mt-12">
          <ClientIntlProvider namespaces={APPLY_FORM_NAMESPACES} select={{ services: selectServiceSummaries }}>
            <Suspense fallback={<ApplyFormSkeleton label={t('loadingForm')} />}>
              <ApplicationForm labelledBy={HEADING_ID} />
            </Suspense>
          </ClientIntlProvider>
        </div>
      </Container>
    </main>
  );
}
