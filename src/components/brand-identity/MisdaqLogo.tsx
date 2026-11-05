import { cn } from '@/lib/cn';

/**
 * The Misdaq logos and marks from public/brand, as plain <img> tags: they are
 * small SVGs, cached once and shared by every page, so next/image adds nothing.
 *
 * The logo files draw in currentColor, which an <img> renders black. `inverted`
 * turns them white for dark backgrounds; the guide allows black or white only.
 * Minimum widths (from the guide): 120px stacked, 160px horizontal; below 32px
 * use a mark.
 */
const VARIANTS = {
  /** مصداق above MISDAQ: the primary logo. */
  stacked: { src: '/brand/logo-stacked.svg', ratio: 4778 / 2518 },
  /** "MISDAQ | مصداق": site headers and nav. */
  horizontal: { src: '/brand/logo-horizontal.svg', ratio: 3975 / 580 },
  arabic: { src: '/brand/logo-arabic.svg', ratio: 3190 / 880 },
  english: { src: '/brand/logo-english.svg', ratio: 3183 / 676 },
  /** Company icon: white ق in the proof frame on a black rounded square. */
  mark: { src: '/brand/mark.svg', ratio: 1 },
  /** The ق in its frame, without the square. */
  glyph: { src: '/brand/mark-glyph.svg', ratio: 1 },
  /** Order evidence product icon (orange square). */
  product: { src: '/brand/mark-orange.svg', ratio: 1 },
} as const;

export type MisdaqLogoVariant = keyof typeof VARIANTS;

export function misdaqLogoSrc(variant: MisdaqLogoVariant): string {
  return VARIANTS[variant].src;
}

export default function MisdaqLogo({
  variant = 'horizontal',
  width,
  inverted = false,
  alt = '',
  priority = false,
  className,
}: {
  variant?: MisdaqLogoVariant;
  /** Rendered width in CSS pixels; the height follows the artwork. */
  width: number;
  /** White instead of black, for dark backgrounds. */
  inverted?: boolean;
  /** Empty when the logo sits next to (or inside) a labelled link. */
  alt?: string;
  /** Above-the-fold logos load eagerly. */
  priority?: boolean;
  className?: string;
}) {
  const { src, ratio } = VARIANTS[variant];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG, see above
    <img
      src={src}
      alt={alt}
      width={width}
      height={Math.round(width / ratio)}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={cn('block shrink-0 select-none', inverted && 'invert', className)}
    />
  );
}
