import type { Metadata } from 'next';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import ClientIntlProvider from '@/components/providers/ClientIntlProvider';
import { ButtonLink } from '@/components/marketing/primitives';
import { NO_INDEX } from '@/lib/seo/site';

export async function generateMetadata(): Promise<Metadata> {
  const [t, tSeo] = await Promise.all([getTranslations('common.notFound'), getTranslations('seo')]);
  return {
    title: tSeo('titleTemplate').replace('%s', t('title')),
    description: t('description'),
    robots: NO_INDEX,
  };
}

/**
 * Localized 404 for everything under /[locale] (unknown brand, admin path, …),
 * also reused by app/not-found.tsx for unmatched URLs. It renders inside
 * app/[locale]/layout.tsx but outside the marketing chrome, so it ships no
 * navbar/footer JavaScript.
 */
export default async function LocaleNotFound() {
  const t = await getTranslations('common.notFound');

  return (
    // next-intl's Link reads the locale from client context; it needs no messages.
    <ClientIntlProvider namespaces={[]}>
      <main
        id="main"
        className="relative isolate flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden bg-navy-deep px-6 py-24 text-center"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-sky-radial" />
        <Image src="/logos/secondy logo 2.svg" alt="" width={72} height={72} />
        <p className="mt-8 text-sm font-bold text-sky ltr:uppercase ltr:tracking-[0.25em]">{t('eyebrow')}</p>
        <h1 className="mt-4 max-w-xl text-balance text-4xl font-black leading-tight text-white sm:text-5xl">
          {t('title')}
        </h1>
        <p className="mt-5 max-w-md text-pretty text-base leading-relaxed text-white/70 sm:text-lg">
          {t('description')}
        </p>
        <ButtonLink href="/" size="lg" className="mt-10">
          <ArrowLeft aria-hidden="true" className="h-4 w-4 rtl:rotate-180" />
          {t('backHome')}
        </ButtonLink>
      </main>
    </ClientIntlProvider>
  );
}
