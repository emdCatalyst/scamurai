import { Storage } from '@google-cloud/storage';
import type { ObjectStorage, StorageBucket } from './types';

/**
 * Google Cloud Storage driver (production).
 *
 * Credentials come from Application Default Credentials: the Cloud Run
 * service account in production, `gcloud auth application-default login`
 * locally. Signed URLs (V4) need the service account to be able to sign:
 * grant it "Service Account Token Creator" on itself, plus "Storage Object
 * Admin" on both buckets.
 *
 * Buckets (uniform bucket-level access, in the same region as the app):
 *   order images  private. CORS must allow PUT with Content-Type and
 *                 x-goog-content-length-range from the app origin, because
 *                 staff phones upload directly with signed URLs.
 *   brand assets  private too; logos are served to browsers through /media.
 */

/**
 * Each signed URL costs a call to IAM (signBlob) and each exists() a call to
 * Cloud Storage. A phone gives up on a request after 20 s and tries again,
 * so a slow call fails here first, as a retryable server error.
 */
const CALL_TIMEOUT_MS = 8_000;
/** Signing slower than this is logged: it shows IAM trouble before phones time out. */
const SLOW_SIGNING_MS = 1_000;
/** Read URLs are reused for half their lifetime, so reopening an order doesn't sign again. */
const READ_URL_CACHE_SIZE = 2_000;

export async function withTimeout<T>(label: string, work: Promise<T>, ms = CALL_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function signed(label: string, sign: () => Promise<[string]>): Promise<string> {
  const started = Date.now();
  const [url] = await withTimeout(label, sign());
  const ms = Date.now() - started;
  if (ms >= SLOW_SIGNING_MS) console.warn('[storage] slow URL signing', JSON.stringify({ label, ms }));
  return url;
}

export function createGcsDriver(bucketNames: Record<StorageBucket, string>): ObjectStorage {
  const client = new Storage();
  const file = (bucket: StorageBucket, key: string) => client.bucket(bucketNames[bucket]).file(key);
  const expiresAt = (seconds: number) => Date.now() + seconds * 1000;
  const readUrls = new Map<string, { url: string; reuseUntil: number }>();

  return {
    async put(bucket, key, body, { contentType, cacheControl }) {
      await file(bucket, key).save(Buffer.from(body), {
        resumable: false,
        contentType,
        metadata: cacheControl ? { cacheControl } : undefined,
      });
    },

    async get(bucket, key) {
      const object = file(bucket, key);
      try {
        const [[body], [metadata]] = await Promise.all([object.download(), object.getMetadata()]);
        return { body: new Uint8Array(body), contentType: metadata.contentType ?? 'application/octet-stream' };
      } catch (error) {
        if ((error as { code?: number }).code === 404) return null;
        throw error;
      }
    },

    async exists(bucket, key) {
      const [exists] = await withTimeout('exists', file(bucket, key).exists());
      return exists;
    },

    async createUploadUrl(bucket, key, { contentType, maxBytes, expiresInSeconds }) {
      // The size range is part of the signature: GCS rejects bigger uploads.
      const extensionHeaders = { 'x-goog-content-length-range': `0,${maxBytes}` };
      const url = await signed('upload URL', () =>
        file(bucket, key).getSignedUrl({
          version: 'v4',
          action: 'write',
          expires: expiresAt(expiresInSeconds),
          contentType,
          extensionHeaders,
        })
      );
      return { url, method: 'PUT', headers: { 'Content-Type': contentType, ...extensionHeaders } };
    },

    async createReadUrl(bucket, key, { expiresInSeconds }) {
      const cacheKey = `${bucket}/${key}/${expiresInSeconds}`;
      const cached = readUrls.get(cacheKey);
      if (cached && cached.reuseUntil > Date.now()) return cached.url;

      const url = await signed('read URL', () =>
        file(bucket, key).getSignedUrl({ version: 'v4', action: 'read', expires: expiresAt(expiresInSeconds) })
      );
      readUrls.delete(cacheKey);
      if (readUrls.size >= READ_URL_CACHE_SIZE) readUrls.delete(readUrls.keys().next().value!);
      readUrls.set(cacheKey, { url, reuseUntil: Date.now() + (expiresInSeconds * 1000) / 2 });
      return url;
    },
  };
}
