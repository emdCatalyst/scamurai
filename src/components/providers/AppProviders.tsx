import { ClerkProvider } from '@clerk/nextjs';
import { NextIntlClientProvider } from 'next-intl';

/**
 * Providers for the authenticated product (admin console, brand portals,
 * onboarding). Kept out of the root layout so public marketing pages stay
 * static and don't download Clerk or the full message catalogue.
 *
 * NextIntlClientProvider without props inherits every namespace from
 * i18n/request.ts, which is what the product UI has always received.
 */
export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <NextIntlClientProvider>{children}</NextIntlClientProvider>
    </ClerkProvider>
  );
}
