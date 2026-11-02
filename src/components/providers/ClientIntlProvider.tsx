import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { loadMessages, pickMessages, type Namespace } from '@/i18n/messages';
import type { Locale } from '@/i18n/routing';

type NamespaceMessages = Record<string, unknown>;

/**
 * Ships only the given namespaces to client components underneath.
 *
 * Server components translate with `getTranslations()` and need nothing here.
 * List only what client islands call `useTranslations()` on, so pages don't
 * serialise the whole catalogue (admin, brand portal, …) into every response.
 * `select` narrows a namespace further to the keys the islands actually read.
 *
 * Nested providers replace (not merge) messages, so a nested provider must
 * list everything its own subtree needs.
 */
export default async function ClientIntlProvider({
  namespaces,
  select = {},
  children,
}: {
  namespaces: readonly Namespace[];
  select?: Partial<Record<Namespace, (messages: NamespaceMessages) => NamespaceMessages>>;
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) as Locale;
  const picked = pickMessages(await loadMessages(locale), namespaces);
  const messages = Object.fromEntries(
    Object.entries(picked).map(([namespace, value]) => {
      const narrow = select[namespace as Namespace];
      return [namespace, narrow ? narrow(value as NamespaceMessages) : value];
    })
  );

  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
}
