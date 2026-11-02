import type { Namespace } from '@/i18n/messages';

/**
 * Message namespaces the apply form's client components read with
 * `useTranslations`. The apply page hands exactly these to its nested
 * ClientIntlProvider; nested providers replace (not merge) messages, so add a
 * namespace here as soon as a form component starts using it.
 */
export const APPLY_FORM_NAMESPACES = ['apply', 'plans', 'services', 'marketing'] as const satisfies readonly Namespace[];
