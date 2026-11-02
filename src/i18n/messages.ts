import type { Locale } from './routing';

/**
 * Messages live in one JSON file per namespace: `messages/<locale>/<namespace>.json`.
 * Small files keep ownership clear (one feature, one file) and let each route
 * group ship only the namespaces its client components need.
 */
export const NAMESPACES = [
  'common',
  'seo',
  'marketing',
  'services',
  'nav',
  'hero',
  'socialProof',
  'about',
  'howItWorks',
  'values',
  'plans',
  'apply',
  'onboarding',
  'footer',
  'suspended',
  'inactive',
  'admin',
  'brand',
] as const;

export type Namespace = (typeof NAMESPACES)[number];
export type Messages = Record<Namespace, Record<string, unknown>>;

export async function loadMessages(locale: Locale): Promise<Messages> {
  const entries = await Promise.all(
    NAMESPACES.map(
      async (namespace) =>
        [namespace, (await import(`../../messages/${locale}/${namespace}.json`)).default] as const
    )
  );
  return Object.fromEntries(entries) as Messages;
}

export function pickMessages(messages: Messages, namespaces: readonly Namespace[]) {
  return Object.fromEntries(namespaces.map((namespace) => [namespace, messages[namespace]]));
}
