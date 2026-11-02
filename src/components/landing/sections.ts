import type { ComponentProps } from 'react';
import type { Link } from '@/i18n/navigation';

type Href = ComponentProps<typeof Link>['href'];

/**
 * In-page anchors on the home page. The sections render these ids and the
 * header, hero and footer link to them, so renaming one happens here only.
 */
export const SECTION_IDS = {
  services: 'services',
  how: 'how',
  about: 'about',
} as const;

export type SectionId = (typeof SECTION_IDS)[keyof typeof SECTION_IDS];

/** Link to a home-page section from any page: `/en#services`, `/ar#how`, ... */
export function homeSectionHref(id: SectionId): Href {
  return { pathname: '/', hash: id };
}

/** Header navigation, in display order. Labels live in the `nav` namespace. */
export const NAV_SECTIONS = [
  { id: SECTION_IDS.services, labelKey: 'services' },
  { id: SECTION_IDS.how, labelKey: 'howItWorks' },
  { id: SECTION_IDS.about, labelKey: 'about' },
] as const;
