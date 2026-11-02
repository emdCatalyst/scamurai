import type { ServiceAccent } from '@/config/services';

/**
 * Per-service visual identity. Class names are written out in full so
 * Tailwind's scanner can see them; never build them with string templates.
 */
export interface AccentStyles {
  /** Foreground accent (icons, small labels). */
  text: string;
  /** Soft tinted surface (icon tiles, chips). */
  soft: string;
  /** Hairline border in the accent colour. */
  border: string;
  /** Hover border for interactive cards. */
  hoverBorder: string;
  /** Focus ring for keyboard users. */
  ring: string;
  /** Focus ring on a container when a child is focused (stretched-link cards). */
  focusWithinRing: string;
  /** Ambient glow behind featured elements. */
  glow: string;
  /** Solid dot / bar. */
  solid: string;
}

export const ACCENTS: Record<ServiceAccent, AccentStyles> = {
  sky: {
    text: 'text-sky',
    soft: 'bg-sky/10',
    border: 'border-sky/25',
    hoverBorder: 'hover:border-sky/40',
    ring: 'focus-visible:ring-sky/60',
    focusWithinRing: 'focus-within:ring-sky/60',
    glow: 'shadow-[0_0_48px_rgba(79,197,223,0.22)]',
    solid: 'bg-sky',
  },
  mint: {
    text: 'text-mint',
    soft: 'bg-mint/10',
    border: 'border-mint/25',
    hoverBorder: 'hover:border-mint/40',
    ring: 'focus-visible:ring-mint/60',
    focusWithinRing: 'focus-within:ring-mint/60',
    glow: 'shadow-[0_0_48px_rgba(92,191,143,0.22)]',
    solid: 'bg-mint',
  },
  amber: {
    text: 'text-amber-300',
    soft: 'bg-amber-300/10',
    border: 'border-amber-300/25',
    hoverBorder: 'hover:border-amber-300/40',
    ring: 'focus-visible:ring-amber-300/60',
    focusWithinRing: 'focus-within:ring-amber-300/60',
    glow: 'shadow-[0_0_48px_rgba(252,211,77,0.18)]',
    solid: 'bg-amber-300',
  },
};
