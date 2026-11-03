import { createHash } from 'node:crypto';
import type { ImageExtension } from './keys';

/**
 * Identifies an uploaded logo by its bytes, not by the client-declared MIME
 * type, so a renamed file can't pass as an image.
 */
export function sniffImage(bytes: Uint8Array): { ext: ImageExtension; contentType: string } | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { ext: 'png', contentType: 'image/png' };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: 'jpg', contentType: 'image/jpeg' };
  }
  const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, 1024)).trimStart().toLowerCase();
  if ((head.startsWith('<?xml') || head.startsWith('<svg') || head.startsWith('<!--')) && head.includes('<svg')) {
    return { ext: 'svg', contentType: 'image/svg+xml' };
  }
  return null;
}

/** Short content hash for content-addressed keys (64 bits is plenty per brand). */
export function contentHash(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex').slice(0, 16);
}
