/**
 * Object storage contract. Route handlers and actions depend on this, never on
 * a provider SDK, so the provider is a configuration choice:
 *
 *   STORAGE_DRIVER=local   files under .storage/ (development and tests)
 *   STORAGE_DRIVER=gcs     Google Cloud Storage (production)
 */

/** Logical buckets; physical bucket names come from the environment. */
export type StorageBucket = 'orderImages' | 'brandAssets';

/** A browser upload target: PUT the file to `url` with exactly these headers. */
export interface UploadTarget {
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
}

export interface StoredObject {
  body: Uint8Array;
  contentType: string;
}

export interface ObjectStorage {
  /** Server-side upload (small files such as logos). */
  put(bucket: StorageBucket, key: string, body: Uint8Array, options: { contentType: string; cacheControl?: string }): Promise<void>;
  /** Server-side read (used to serve public assets through /media). `null` when missing. */
  get(bucket: StorageBucket, key: string): Promise<StoredObject | null>;
  exists(bucket: StorageBucket, key: string): Promise<boolean>;
  /** Short-lived URL the browser can upload one file to, directly. */
  createUploadUrl(
    bucket: StorageBucket,
    key: string,
    options: { contentType: string; maxBytes: number; expiresInSeconds: number }
  ): Promise<UploadTarget>;
  /** Short-lived URL to read a private object. */
  createReadUrl(bucket: StorageBucket, key: string, options: { expiresInSeconds: number }): Promise<string>;
}
