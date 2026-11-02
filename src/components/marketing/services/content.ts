import type { ServiceKey } from '@/config/services';

/**
 * Shape of the copy behind the service detail page template.
 *
 * Copy lives in `messages/<locale>/services.json`:
 *   services.<serviceKey>.{name, tagline, summary, seo, hero, problems, steps, features, faq, cta}
 *   services.page.*  template copy shared by every service (labels, eyebrows, notes)
 *
 * Every service has the same structure, so one template renders them all and
 * the sections stay visually balanced. The id lists below are the only place
 * that says how many items a section has; `content.test.ts` checks every
 * service in every locale against them. Pure module: no React or next-intl.
 */
export const HERO_HIGHLIGHT_IDS = ['1', '2', '3'] as const;
export const PROBLEM_IDS = ['1', '2', '3'] as const;
export const STEP_IDS = ['1', '2', '3', '4'] as const;
export const FEATURE_IDS = ['1', '2', '3', '4', '5', '6'] as const;
export const FAQ_IDS = ['1', '2', '3', '4', '5', '6'] as const;
export const EARLY_ACCESS_POINT_IDS = ['1', '2', '3'] as const;

export type FeatureId = (typeof FEATURE_IDS)[number];

/** Namespace with one service's copy, e.g. `services.dispute_orders`. */
export function serviceNamespace(key: ServiceKey) {
  return `services.${key}` as const;
}

/** Namespace with the copy shared by every service page. */
export const PAGE_NAMESPACE = 'services.page';

/** Every message key path a service must define (relative to its namespace). */
export function serviceMessageKeys(): string[] {
  const items = (section: string, ids: readonly string[], fields: readonly string[]) =>
    ids.flatMap((id) => fields.map((field) => `${section}.items.${id}.${field}`));

  return [
    'name',
    'tagline',
    'summary',
    'seo.title',
    'seo.description',
    ...HERO_HIGHLIGHT_IDS.map((id) => `hero.highlights.${id}`),
    'problems.title',
    'problems.description',
    ...items('problems', PROBLEM_IDS, ['problem', 'solution']),
    'steps.title',
    'steps.description',
    ...items('steps', STEP_IDS, ['title', 'description']),
    'features.title',
    'features.description',
    ...items('features', FEATURE_IDS, ['title', 'description']),
    ...items('faq', FAQ_IDS, ['question', 'answer']),
    'cta.title',
    'cta.description',
  ];
}
