import { getStorage, IMMUTABLE_CACHE } from './index';
import { contentHash, sniffImage } from './images';
import { mediaPath, type ImageExtension } from './keys';

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export type LogoUploadResult =
  | { ok: true; url: string }
  | { ok: false; status: 400 | 413; error: string };

/**
 * Validates an uploaded logo by its bytes and stores it under a
 * content-addressed key, returning the stable /media path to save in the
 * database. Shared by the brand and delivery-app logo endpoints.
 */
export async function storeLogo(
  file: File | null,
  keyFor: (hash: string, ext: ImageExtension) => string,
  maxBytes = LOGO_MAX_BYTES
): Promise<LogoUploadResult> {
  if (!file) return { ok: false, status: 400, error: 'No file provided' };
  if (file.size > maxBytes) return { ok: false, status: 413, error: `File too large (max ${maxBytes / 1024 / 1024}MB)` };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const image = sniffImage(bytes);
  if (!image) return { ok: false, status: 400, error: 'Invalid file type (PNG, JPG or SVG)' };

  const key = keyFor(contentHash(bytes), image.ext);
  await getStorage().put('brandAssets', key, bytes, { contentType: image.contentType, cacheControl: IMMUTABLE_CACHE });
  return { ok: true, url: mediaPath(key) };
}
