import { createHmac, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ObjectStorage, StorageBucket, StoredObject, UploadTarget } from './types';

/**
 * Development driver: objects are files under `.storage/<bucket>/<key>`, and
 * upload/read URLs point at /api/storage/local with an HMAC-signed, expiring
 * token. It behaves like Cloud Storage signed URLs (time-limited, one object,
 * one operation, size-capped uploads) so the app code is identical in both.
 * Never enabled in production (see ./index.ts).
 */

export const LOCAL_STORAGE_ROUTE = '/api/storage/local';

interface TokenPayload {
  /** bucket */
  b: StorageBucket;
  /** key */
  k: string;
  /** operation */
  op: 'put' | 'get';
  /** expiry, epoch seconds */
  exp: number;
  /** content type (uploads) */
  ct?: string;
  /** max bytes (uploads) */
  max?: number;
}

export interface LocalDriverOptions {
  rootDir: string;
  secret: string;
}

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

/** Every logical bucket (TypeScript keeps the list complete). Anything else is refused. */
const BUCKETS = { orderImages: true, brandAssets: true } satisfies Record<StorageBucket, true>;

const isBucket = (value: unknown): value is StorageBucket => typeof value === 'string' && Object.hasOwn(BUCKETS, value);

export function createLocalDriver({ rootDir, secret }: LocalDriverOptions): ObjectStorage & {
  verifyToken(token: string, op: TokenPayload['op']): TokenPayload | null;
  write(payload: TokenPayload, body: Uint8Array): Promise<void>;
} {
  const root = path.resolve(rootDir);

  /** Absolute file path for an object, or null for an unknown bucket or a key that escapes its bucket. */
  function resolveObject(bucket: unknown, key: unknown): string | null {
    if (!isBucket(bucket) || typeof key !== 'string') return null;
    const bucketDir = path.join(root, bucket);
    const resolved = path.resolve(bucketDir, key);
    return resolved.startsWith(bucketDir + path.sep) ? resolved : null;
  }

  function filePath(bucket: StorageBucket, key: string): string {
    const resolved = resolveObject(bucket, key);
    if (!resolved) throw new Error('Invalid object key');
    return resolved;
  }

  function sign(payload: TokenPayload): string {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const mac = createHmac('sha256', secret).update(body).digest('base64url');
    return `${body}.${mac}`;
  }

  function verifyToken(token: string, op: TokenPayload['op']): TokenPayload | null {
    const [body, mac] = token.split('.');
    if (!body || !mac) return null;
    const expected = createHmac('sha256', secret).update(body).digest();
    const given = Buffer.from(mac, 'base64url');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
    let payload: Partial<TokenPayload> | null;
    try {
      payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    } catch {
      return null;
    }
    if (payload?.op !== op || typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    // Even a correctly signed token may only name an object inside a known bucket.
    return resolveObject(payload.b, payload.k) ? (payload as TokenPayload) : null;
  }

  const urlFor = (payload: TokenPayload) => `${LOCAL_STORAGE_ROUTE}?token=${encodeURIComponent(sign(payload))}`;
  const expiry = (seconds: number) => Math.floor(Date.now() / 1000) + seconds;

  async function readObject(bucket: StorageBucket, key: string): Promise<StoredObject | null> {
    try {
      const body = await readFile(filePath(bucket, key));
      return { body: new Uint8Array(body), contentType: CONTENT_TYPES[path.extname(key)] ?? 'application/octet-stream' };
    } catch {
      return null;
    }
  }

  return {
    verifyToken,

    /** Writes an upload authorised by a verified `put` token. */
    async write(payload, body) {
      if (payload.max !== undefined && body.byteLength > payload.max) throw new Error('Upload too large');
      const target = filePath(payload.b, payload.k);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, body);
    },

    async put(bucket, key, body) {
      const target = filePath(bucket, key);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, body);
    },

    get: readObject,

    async exists(bucket, key) {
      try {
        return (await stat(filePath(bucket, key))).isFile();
      } catch {
        return false;
      }
    },

    async createUploadUrl(bucket, key, { contentType, maxBytes, expiresInSeconds }): Promise<UploadTarget> {
      filePath(bucket, key); // validate early
      return {
        url: urlFor({ b: bucket, k: key, op: 'put', exp: expiry(expiresInSeconds), ct: contentType, max: maxBytes }),
        method: 'PUT',
        headers: { 'Content-Type': contentType },
      };
    },

    async createReadUrl(bucket, key, { expiresInSeconds }) {
      filePath(bucket, key);
      return urlFor({ b: bucket, k: key, op: 'get', exp: expiry(expiresInSeconds) });
    },
  };
}
