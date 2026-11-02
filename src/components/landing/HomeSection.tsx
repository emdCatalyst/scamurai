import type { ComponentProps } from 'react';
import { Section } from '@/components/marketing/primitives';
import { cn } from '@/lib/cn';
import type { SectionId } from './sections';

/**
 * A home-page section that in-page links (`/#services`, `/#how`, ...) land on.
 *
 * Next.js scrolls to a hash target and then calls `focus()` on it, so keyboard
 * and screen-reader users carry on from the section instead of from the link
 * they activated. That only works on a focusable element, so the anchor is a
 * named region that accepts programmatic focus (tabIndex -1).
 *
 * `overflow-clip` (not `hidden`) keeps the page as the scroll container that
 * `.reveal` children animate against.
 */
export default function HomeSection({
  id,
  labelledBy,
  tone,
  className,
  children,
}: {
  id: SectionId;
  /** id of the heading that names the section. */
  labelledBy: string;
  tone?: ComponentProps<typeof Section>['tone'];
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Section tone={tone} className={cn('overflow-clip', className)}>
      <div id={id} role="region" aria-labelledby={labelledBy} tabIndex={-1} className="scroll-mt-20 focus:outline-none">
        {children}
      </div>
    </Section>
  );
}
