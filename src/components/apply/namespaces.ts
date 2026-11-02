import { SERVICE_KEYS } from '@/config/services';
import type { Namespace } from '@/i18n/messages';

/**
 * Message namespaces the apply form's client components read with
 * `useTranslations`. The apply page hands exactly these to its nested
 * ClientIntlProvider; nested providers replace (not merge) messages, so add a
 * namespace here as soon as a form component starts using it.
 */
export const APPLY_FORM_NAMESPACES = ['apply', 'plans', 'services', 'marketing'] as const satisfies readonly Namespace[];

/** Keys of `services.<serviceKey>` the form reads; the rest is service-page copy. */
const SERVICE_FIELDS_USED = ['name', 'tagline'] as const;

/** Narrows the `services` namespace to what the form shows (name and tagline per service). */
export function selectServiceSummaries(services: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    SERVICE_KEYS.map((key) => {
      const service = (services[key] ?? {}) as Record<string, unknown>;
      return [key, Object.fromEntries(SERVICE_FIELDS_USED.map((field) => [field, service[field]]))];
    })
  );
}
