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
export function createGcsDriver(bucketNames: Record<StorageBucket, string>): ObjectStorage {
  const client = new Storage();
  const file = (bucket: StorageBucket, key: string) => client.bucket(bucketNames[bucket]).file(key);
  const expiresAt = (seconds: number) => Date.now() + seconds * 1000;

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
      const [exists] = await file(bucket, key).exists();
      return exists;
    },

    async createUploadUrl(bucket, key, { contentType, maxBytes, expiresInSeconds }) {
      // The size range is part of the signature: GCS rejects bigger uploads.
      const extensionHeaders = { 'x-goog-content-length-range': `0,${maxBytes}` };
      const [url] = await file(bucket, key).getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: expiresAt(expiresInSeconds),
        contentType,
        extensionHeaders,
      });
      return { url, method: 'PUT', headers: { 'Content-Type': contentType, ...extensionHeaders } };
    },

    async createReadUrl(bucket, key, { expiresInSeconds }) {
      const [url] = await file(bucket, key).getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: expiresAt(expiresInSeconds),
      });
      return url;
    },
  };
}
