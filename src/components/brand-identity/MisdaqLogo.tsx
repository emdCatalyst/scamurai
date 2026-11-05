import type { Locale } from '@/i18n/routing';
import { cn } from '@/lib/cn';

/**
 * The Misdaq logos and marks from public/brand, as plain <img> tags: they are
 * small SVGs, cached once and shared by every page, so next/image adds nothing.
 *
 * One wordmark per language, never both: English pages show "MISDAQ", Arabic
 * pages "مصداق". The ق mark is the icon (favicons, app icons, the collapsed
 * admin sidebar) and reads in both languages.
 *
 * The files draw in currentColor, which an <img> renders black. `inverted`
 * turns them white for dark backgrounds; the guide allows black or white only.
 * width and height are always set, so the logo never shifts the layout.
 */
const WORDMARKS: Record<Locale, { src: string; ratio: number; name: string; scale: number }> = {
  en: { src: '/brand/logo-english.svg', ratio: 3183 / 676, name: 'Misdaq', scale: 1 },
  // The Arabic letters sit lower and smaller in their box than the Latin
  // capitals, so the box is taller to give both the same visual weight.
  ar: { src: '/brand/logo-arabic.svg', ratio: 3190 / 880, name: 'مصداق', scale: 1.3 },
};

const MARKS = {
  /** Company icon: white ق in the proof frame on a black rounded square. */
  mark: '/brand/mark.svg',
  /** The ق in its frame, without the square. */
  glyph: '/brand/mark-glyph.svg',
  /** Order evidence product icon (orange square). */
  product: '/brand/mark-orange.svg',
} as const;

export type MisdaqMarkVariant = keyof typeof MARKS;

/** The brand name as written in `locale`: the wordmark's accessible name. */
export function misdaqName(locale: Locale): string {
  return WORDMARKS[locale].name;
}

/** The wordmark file for `locale`, e.g. for an email or a share image. */
export function misdaqWordmarkSrc(locale: Locale): string {
  return WORDMARKS[locale].src;
}

interface ImageProps {
  /** White instead of black, for dark backgrounds. */
  inverted?: boolean;
  /** Above-the-fold logos load eagerly. */
  priority?: boolean;
  className?: string;
}

function BrandImage({
  src,
  width,
  height,
  alt,
  inverted,
  priority,
  className,
}: ImageProps & { src: string; width: number; height: number; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG, see above
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      className={cn('block shrink-0 select-none', inverted && 'invert', className)}
    />
  );
}

/**
 * The wordmark of the page's language. `height` is the English wordmark's
 * height in CSS pixels; the Arabic one is drawn a little taller to match it.
 */
export default function MisdaqLogo({
  locale,
  height,
  alt,
  ...rest
}: ImageProps & {
  locale: Locale;
  height: number;
  /** Defaults to the brand name in `locale`; pass '' inside a link that has its own label. */
  alt?: string;
}) {
  const { src, ratio, name, scale } = WORDMARKS[locale];
  const boxHeight = Math.round(height * scale);
  return (
    <BrandImage {...rest} src={src} width={Math.round(boxHeight * ratio)} height={boxHeight} alt={alt ?? name} />
  );
}

/** A square brand mark, `size` CSS pixels wide and tall. */
export function MisdaqMark({
  variant = 'mark',
  size,
  alt = '',
  ...rest
}: ImageProps & { variant?: MisdaqMarkVariant; size: number; alt?: string }) {
  return <BrandImage {...rest} src={MARKS[variant]} width={size} height={size} alt={alt} />;
}
