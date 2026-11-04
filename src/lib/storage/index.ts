import { randomBytes } from 'node:crypto';
import { createGcsDriver } from './gcsDriver';
import { createLocalDriver } from './localDriver';
import type { ObjectStorage, StorageBucket } from './types';

export type { ObjectStorage, StorageBucket, UploadTarget } from './types';

/**
 * Storage entry point. Server-only.
 *
 *   STORAGE_DRIVER                gcs | local (default: local outside production)
 *   STORAGE_BUCKET_ORDER_IMAGES   physical bucket names (gcs)
 *   STORAGE_BUCKET_BRAND_ASSETS
 *   STORAGE_LOCAL_DIR             local driver root (default .storage)
 *   STORAGE_SIGNING_SECRET        local driver URL signing secret, 32+ characters
 *                                 (default: random per process)
 */

type Driver = 'gcs' | 'local';

export function storageDriver(): Driver {
  const configured = process.env.STORAGE_DRIVER;
  if (configured === 'gcs' || configured === 'local') return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('STORAGE_DRIVER must be set in production (gcs).');
  }
  return 'local';
}

function bucketNames(): Record<StorageBucket, string> {
  return {
    orderImages: process.env.STORAGE_BUCKET_ORDER_IMAGES || 'scamurai-order-images',
    brandAssets: process.env.STORAGE_BUCKET_BRAND_ASSETS || 'scamurai-brand-assets',
  };
}

let cached: ReturnType<typeof createLocalDriver> | ObjectStorage | null = null;

export function getStorage(): ObjectStorage {
  if (cached) return cached;
  cached = storageDriver() === 'gcs' ? createGcsDriver(bucketNames()) : getLocalDriver();
  return cached;
}

// On globalThis, so hot reloads and every bundle that includes this module share one secret.
const globalForStorage = globalThis as unknown as {
  localSigningSecret: string | undefined;
};

/**
 * The local driver's URL signing secret. There is no default anyone could
 * sign with: unless configured it is random per process, which costs nothing
 * because signed URLs live minutes and a failed upload asks for new ones.
 */
function localSigningSecret(): string {
  const configured = process.env.STORAGE_SIGNING_SECRET;
  if (configured) {
    if (configured.length < 32) throw new Error('STORAGE_SIGNING_SECRET must be at least 32 characters, or unset.');
    return configured;
  }
  globalForStorage.localSigningSecret ??= randomBytes(32).toString('base64url');
  return globalForStorage.localSigningSecret;
}

/** The local driver itself (for its upload/download route). Refuses to run in production. */
export function getLocalDriver(): ReturnType<typeof createLocalDriver> {
  if (process.env.NODE_ENV === 'production' || storageDriver() !== 'local') {
    throw new Error('The local storage driver is only available in development.');
  }
  if (cached && 'verifyToken' in cached) return cached;
  const driver = createLocalDriver({
    rootDir: process.env.STORAGE_LOCAL_DIR || '.storage',
    secret: localSigningSecret(),
  });
  cached = driver;
  return driver;
}

/** Upload and read URLs for order photos stay valid this long. */
export const ORDER_IMAGE_UPLOAD_TTL_SECONDS = 15 * 60;
export const ORDER_IMAGE_READ_TTL_SECONDS = 10 * 60;
/** Order photos are compressed in the browser to ~300 KB; this is a hard cap. */
export const ORDER_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
/** Logos are content-addressed, so they can be cached forever. */
export const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';
