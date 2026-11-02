import towerDesktopAvif from '../../../public/assets/hero/kingdom-tower-1920.avif';
import towerDesktopWebp from '../../../public/assets/hero/kingdom-tower-1920.webp';
import towerMobileAvif from '../../../public/assets/hero/kingdom-tower-768.avif';
import towerMobileWebp from '../../../public/assets/hero/kingdom-tower-768.webp';
import visionLockupAvif from '../../../public/assets/vision-2030/scamurai-x-vision-2030-480.avif';
import visionLockupWebp from '../../../public/assets/vision-2030/scamurai-x-vision-2030-480.webp';
import type { EncodedImage } from './Picture';

/**
 * Raster artwork for the public site, generated from the design sources by
 * `node scripts/optimize-images.mjs`. Static imports (rather than /public
 * URLs) give every file a content-hashed URL that browsers cache immutably.
 */

/** Kingdom Tower hero art, shown at one CSS pixel per image pixel, top-centred. */
export const HERO_ART = {
  /** Full 1920×1080 composition. */
  desktop: { avif: towerDesktopAvif, webp: towerDesktopWebp },
  /** 768px-wide centre crop: identical framing on any viewport narrower than 768px. */
  narrow: { avif: towerMobileAvif, webp: towerMobileWebp },
} satisfies Record<string, EncodedImage>;

/** "Scamurai × Saudi Vision 2030" lock-up, 3× its 160px display width, on the offwhite strip colour. */
export const VISION_2030_LOCKUP: EncodedImage = { avif: visionLockupAvif, webp: visionLockupWebp };
