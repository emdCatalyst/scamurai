import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { loadMessages, pickMessages, type Namespace } from '@/i18n/messages';
import type { Locale } from '@/i18n/routing';

/**
 * Ships only the given namespaces to client components underneath.
 *
 * Server components translate with `getTranslations()` and need nothing here.
 * List only what client islands call `useTranslations()` on, so pages don't
 * serialise the whole catalogue (admin, brand portal, …) into every response.
 *
 * Nested providers replace (not merge) messages, so a nested provider must
 * list everything its own subtree needs.
 */
export default async function ClientIntlProvider({
  namespaces,
  children,
}: {
  namespaces: readonly Namespace[];
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) as Locale;
  const messages = pickMessages(await loadMessages(locale), namespaces);

  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
}
