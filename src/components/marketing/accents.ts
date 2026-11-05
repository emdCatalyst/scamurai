import type { ServiceAccent } from '@/config/services';

/**
 * Per-service product colour (Misdaq guide: one colour per product, never two
 * in one design). The colour marks the product (its icon tile, dots, check
 * marks, featured borders); text stays white on the dark site. Class names are
 * written out in full so Tailwind's scanner can see them; never build them with
 * string templates.
 */
export interface AccentStyles {
  /** Text that used to carry the accent: white, per the guide. */
  text: string;
  /** Small non-text marks in the product colour (check marks, icons). */
  marker: string;
  /** The product icon tile: solid product colour with its readable foreground. */
  tile: string;
  /** Neutral tinted surface (callouts, selected cards). */
  soft: string;
  /** Hairline border in the product colour. */
  border: string;
  /** Hover border for interactive cards. */
  hoverBorder: string;
  /** Focus ring for keyboard users. */
  ring: string;
  /** Focus ring on a container when a child is focused (stretched-link cards). */
  focusWithinRing: string;
  /** Solid dot / bar. */
  solid: string;
}

export const ACCENTS: Record<ServiceAccent, AccentStyles> = {
  // دليل الطلب: text on orange is black (6.4:1).
  orange: {
    text: 'text-white',
    marker: 'text-sky',
    tile: 'bg-sky text-navy',
    soft: 'bg-white/[0.05]',
    border: 'border-sky/50',
    hoverBorder: 'hover:border-sky/60',
    ring: 'focus-visible:ring-sky/60',
    focusWithinRing: 'focus-within:ring-sky/60',
    solid: 'bg-sky',
  },
  // عين التشغيل: text on cobalt is white (5.2:1).
  cobalt: {
    text: 'text-white',
    marker: 'text-cobalt',
    tile: 'bg-cobalt text-white',
    soft: 'bg-white/[0.05]',
    border: 'border-cobalt/60',
    hoverBorder: 'hover:border-cobalt/70',
    ring: 'focus-visible:ring-cobalt/70',
    focusWithinRing: 'focus-within:ring-cobalt/70',
    solid: 'bg-cobalt',
  },
  // توثيق الاستلام: text on yellow is black (12.6:1).
  yellow: {
    text: 'text-white',
    marker: 'text-saffron',
    tile: 'bg-saffron text-navy',
    soft: 'bg-white/[0.05]',
    border: 'border-saffron/50',
    hoverBorder: 'hover:border-saffron/60',
    ring: 'focus-visible:ring-saffron/60',
    focusWithinRing: 'focus-within:ring-saffron/60',
    solid: 'bg-saffron',
  },
};
