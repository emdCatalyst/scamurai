import { redirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';

/**
 * Retired route. Submissions are confirmed in place on /apply, where the
 * page knows the service and email; a standalone page could only show a
 * generic "received" message to anyone who opens the URL. Old links and
 * bookmarks land on the form instead. Temporary (307) so the path can be
 * reused later, e.g. as a dedicated conversion URL.
 */
export default async function ApplySuccessPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: '/apply', locale: locale as Locale });
}
