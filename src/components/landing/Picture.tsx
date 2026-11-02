import { Fragment } from 'react';
import { getImageProps, type StaticImageData } from 'next/image';

/** One image in two encodings, as produced by scripts/optimize-images.mjs. */
export interface EncodedImage {
  avif: StaticImageData;
  webp: StaticImageData;
}

interface PictureProps {
  /** Default image, used when no `variants` media query matches. */
  image: EncodedImage;
  /** Art-directed alternatives; the first matching media query wins. */
  variants?: readonly { media: string; image: EncodedImage }[];
  /** Empty string for decorative images. */
  alt: string;
  className?: string;
  /** Above-the-fold artwork (an LCP candidate): load immediately, at high priority. */
  priority?: boolean;
}

/**
 * `<picture>` for pre-encoded local images: AVIF first, WebP fallback, with
 * optional art direction. Files are served as-is (`unoptimized`) because they
 * are already encoded for their display size; running them through the image
 * optimizer again would only re-compress them.
 */
export default function Picture({ image, variants = [], alt, className, priority = false }: PictureProps) {
  const { props } = getImageProps({
    src: image.webp,
    alt,
    className,
    unoptimized: true,
    loading: priority ? 'eager' : 'lazy',
    fetchPriority: priority ? 'high' : undefined,
  });

  return (
    <picture>
      {variants.map(({ media, image: variant }) => (
        <Fragment key={media}>
          <Source media={media} image={variant.avif} type="image/avif" />
          <Source media={media} image={variant.webp} type="image/webp" />
        </Fragment>
      ))}
      <Source image={image.avif} type="image/avif" />
      <img {...props} alt={alt} />
    </picture>
  );
}

function Source({ image, type, media }: { image: StaticImageData; type: string; media?: string }) {
  return <source media={media} type={type} srcSet={image.src} width={image.width} height={image.height} />;
}
