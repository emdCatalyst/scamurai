/**
 * Object keys are decided by the server, never taken from the client, so one
 * brand can't point at another brand's files. Public assets are referenced in
 * the database by their `/media/<key>` path (served by app/media/[...key]),
 * which stays valid when the storage provider, bucket or region changes.
 */

export type OrderImageType = 'sealed' | 'opened';
export const ORDER_IMAGE_TYPES: readonly OrderImageType[] = ['sealed', 'opened'];

export type ImageExtension = 'png' | 'jpg' | 'svg';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HASH = /^[0-9a-f]{16}$/;

function assertUuid(value: string, label: string) {
  if (!UUID.test(value)) throw new Error(`Invalid ${label}`);
}

/** Private: one photo of one order (bucket: orderImages). */
export function orderImageKey(brandId: string, orderId: string, type: OrderImageType): string {
  assertUuid(brandId, 'brand id');
  assertUuid(orderId, 'order id');
  return `${brandId}/${orderId}/${type}.jpg`;
}

/** Public, content-addressed (never overwritten): a brand's logo (bucket: brandAssets). */
export function brandLogoKey(brandId: string, contentHash: string, ext: ImageExtension): string {
  assertUuid(brandId, 'brand id');
  if (!HASH.test(contentHash)) throw new Error('Invalid content hash');
  return `brands/${brandId}/logo-${contentHash}.${ext}`;
}

/** Public, content-addressed: a delivery app logo in the platform catalog (bucket: brandAssets). */
export function catalogLogoKey(contentHash: string, ext: ImageExtension): string {
  if (!HASH.test(contentHash)) throw new Error('Invalid content hash');
  return `delivery-apps/logo-${contentHash}.${ext}`;
}

export const MEDIA_PREFIX = '/media/';

export function mediaPath(key: string): string {
  return `${MEDIA_PREFIX}${key}`;
}

const PUBLIC_KEY = /^(brands\/[0-9a-f-]{36}\/logo|delivery-apps\/logo)-[0-9a-f]{16}\.(png|jpg|svg)$/;

/** Whether `key` names a public asset that /media may serve. Rejects traversal and anything else. */
export function isPublicAssetKey(key: string): boolean {
  return PUBLIC_KEY.test(key);
}

/** A logo stored for `brandId` (what brand actions accept as logoUrl). */
export function isBrandLogoPath(value: string, brandId: string): boolean {
  const key = value.startsWith(MEDIA_PREFIX) ? value.slice(MEDIA_PREFIX.length) : '';
  return isPublicAssetKey(key) && key.startsWith(`brands/${brandId.toLowerCase()}/`);
}

/** A delivery-app catalog logo (what catalog actions accept as logoUrl). */
export function isCatalogLogoPath(value: string): boolean {
  const key = value.startsWith(MEDIA_PREFIX) ? value.slice(MEDIA_PREFIX.length) : '';
  return isPublicAssetKey(key) && key.startsWith('delivery-apps/');
}
