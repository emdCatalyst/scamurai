import { ClerkProvider } from '@clerk/nextjs';
import { NextIntlClientProvider } from 'next-intl';
import { ToastProvider } from '@/components/ui/Toast';

/**
 * Providers for the authenticated product (admin console, brand portals,
 * onboarding). Kept out of the root layout so public marketing pages stay
 * static and download neither Clerk, the full message catalogue, nor the
 * toast system (which pulls in framer-motion).
 *
 * NextIntlClientProvider without props inherits every namespace from
 * i18n/request.ts, which is what the product UI has always received.
 *
 * `dynamic` makes Clerk render its script with the request's CSP nonce
 * (x-nonce, from src/proxy.ts); without it the strict policy blocks Clerk.
 * These pages are rendered per request anyway.
 */
export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider dynamic>
      <NextIntlClientProvider>
        <ToastProvider>{children}</ToastProvider>
      </NextIntlClientProvider>
    </ClerkProvider>
  );
}
