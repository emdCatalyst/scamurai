import type { ComponentProps } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { NextIntlClientProvider } from 'next-intl';
import ClientIntlProvider from '@/components/providers/ClientIntlProvider';
import { ToastProvider } from '@/components/ui/Toast';

type MessageSelection = Omit<ComponentProps<typeof ClientIntlProvider>, 'children'>;

/**
 * Providers for the authenticated product (admin console, brand portals,
 * onboarding). Kept out of the root layout so public marketing pages stay
 * static and download neither Clerk, the full message catalogue, nor the
 * toast system.
 *
 * Without `messages`, NextIntlClientProvider inherits every namespace from
 * i18n/request.ts, which is what the product UI has always received. Pass a
 * selection to ship less, as the brand layout does for staff on old phones.
 *
 * `dynamic` makes Clerk render its script with the request's CSP nonce
 * (x-nonce, from src/proxy.ts); without it the strict policy blocks Clerk.
 * These pages are rendered per request anyway.
 */
export default function AppProviders({
  children,
  messages,
}: {
  children: React.ReactNode;
  messages?: MessageSelection;
}) {
  const content = <ToastProvider>{children}</ToastProvider>;
  return (
    <ClerkProvider dynamic>
      {messages ? (
        <ClientIntlProvider {...messages}>{content}</ClientIntlProvider>
      ) : (
        <NextIntlClientProvider>{content}</NextIntlClientProvider>
      )}
    </ClerkProvider>
  );
}
