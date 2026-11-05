'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePathname } from '@/i18n/navigation';
import { localizedPath } from '@/i18n/paths';
import type { Locale } from '@/i18n/routing';
import { cn } from '@/lib/cn';

interface LocaleSwitchProps {
  /** Locale to switch to. */
  locale: Locale;
  /** That locale's own name for itself, e.g. "العربية". */
  label: string;
  className?: string;
}

/**
 * A real link to the current page in another locale: crawlable, works before
 * hydration and in a new tab. The path is part of the static HTML; the query
 * string (e.g. a plan preselected on /apply) is added on the client, because
 * reading search params while prerendering would make every page dynamic.
 *
 * The href is built here rather than by next-intl's Link, which keeps an /en
 * prefix when switching to English (for its locale cookie). English lives at
 * the root, so the link must point straight at /services/x, not /en/services/x.
 */
export default function LocaleSwitch(props: LocaleSwitchProps) {
  return (
    <Suspense fallback={<LocaleLink {...props} />}>
      <LocaleLinkWithQuery {...props} />
    </Suspense>
  );
}

function LocaleLinkWithQuery(props: LocaleSwitchProps) {
  const query = useSearchParams().toString();
  return <LocaleLink {...props} query={query} />;
}

function LocaleLink({ locale, label, className, query }: LocaleSwitchProps & { query?: string }) {
  // The current page without its locale prefix, e.g. '/services/x' on /ar/services/x.
  const pathname = usePathname();
  const href = localizedPath(locale, pathname);

  return (
    <Link
      href={query ? `${href}?${query}` : href}
      hrefLang={locale}
      lang={locale}
      className={cn('[&:lang(ar)]:font-arabic [&:lang(en)]:font-sans', className)}
    >
      {label}
    </Link>
  );
}
