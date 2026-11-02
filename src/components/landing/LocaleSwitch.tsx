'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link, usePathname } from '@/i18n/navigation';
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
  const pathname = usePathname();

  return (
    <Link
      href={query ? `${pathname}?${query}` : pathname}
      locale={locale}
      lang={locale}
      className={cn('[&:lang(ar)]:font-arabic [&:lang(en)]:font-sans', className)}
    >
      {label}
    </Link>
  );
}
