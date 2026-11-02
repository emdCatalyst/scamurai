import './globals.css';
import { getLocale } from 'next-intl/server';
import { cn } from '@/lib/cn';
import { poppins } from '@/lib/fonts';
import LocaleNotFound from './[locale]/not-found';

export { generateMetadata } from './[locale]/not-found';

/**
 * Fallback for URLs no route matches (e.g. /ar/unknown-page). The locale comes
 * from the proxy (next-intl), falling back to the default locale.
 *
 * The real root layout is app/[locale]/layout.tsx, so Next.js wraps this page
 * in a bare <html><body> of its own: rendering another <html> here would nest
 * documents. Language, direction and font are therefore set on a wrapper, and
 * the UI is the localized 404 itself.
 */
export default async function RootNotFound() {
  const locale = await getLocale();

  return (
    <div
      lang={locale}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className={cn(poppins.variable, locale === 'ar' ? 'font-arabic' : 'font-sans', 'antialiased')}
    >
      <LocaleNotFound />
    </div>
  );
}
