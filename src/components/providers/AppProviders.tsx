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
 */
export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <NextIntlClientProvider>
        <ToastProvider>{children}</ToastProvider>
      </NextIntlClientProvider>
    </ClerkProvider>
  );
}
