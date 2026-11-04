import { createHmac } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { getStorage } from '@/lib/storage';
import { orderImageKey } from '@/lib/storage/keys';
import { GET, PUT } from './route';

// Only the local driver runs here; don't load the Cloud Storage client.
vi.mock('@/lib/storage/gcsDriver', () => ({ createGcsDriver: () => ({}) }));

const SECRET = 'route-test-secret-of-32-chars!!!';
const BRAND = '0f8b7c2e-1d2a-4b3c-8d4e-5f6a7b8c9d0e';
const ORDER = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2]);

/** A token signed with the configured secret, so only the driver's bucket and key checks stand in the way. */
function signedUrl(payload: object): string {
  const body = Buffer.from(JSON.stringify({ exp: 9e9, ...payload })).toString('base64url');
  const token = `${body}.${createHmac('sha256', SECRET).update(body).digest('base64url')}`;
  return `/api/storage/local?token=${encodeURIComponent(token)}`;
}

const put = (url: string, body = JPEG) =>
  PUT(new Request(`http://localhost${url}`, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body }));
const get = (url: string) => GET(new Request(`http://localhost${url}`));

describe('/api/storage/local', () => {
  let root: string;

  beforeAll(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'scamurai-local-route-'));
    vi.stubEnv('STORAGE_DRIVER', 'local');
    vi.stubEnv('STORAGE_LOCAL_DIR', root);
    vi.stubEnv('STORAGE_SIGNING_SECRET', SECRET);
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => {
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
  });

  it('stores an upload and serves it back', async () => {
    const key = orderImageKey(BRAND, ORDER, 'sealed');
    const upload = await getStorage().createUploadUrl('orderImages', key, { contentType: 'image/jpeg', maxBytes: 100, expiresInSeconds: 60 });
    expect((await put(upload.url)).status).toBe(200);

    const read = await get(await getStorage().createReadUrl('orderImages', key, { expiresInSeconds: 60 }));
    expect(read.status).toBe(200);
    expect(new Uint8Array(await read.arrayBuffer())).toEqual(JPEG);
  });

  it('answers 403 for tokens naming another bucket or a key outside the bucket', async () => {
    expect((await get(signedUrl({ b: '..', k: 'package.json', op: 'get' }))).status).toBe(403);
    expect((await get(signedUrl({ b: 'orderImages', k: '../../package.json', op: 'get' }))).status).toBe(403);
    expect((await put(signedUrl({ b: 'orderImages', k: '../../escape.jpg', op: 'put', ct: 'image/jpeg' }))).status).toBe(403);
    expect((await put(signedUrl({ b: '..', k: 'escape.jpg', op: 'put', ct: 'image/jpeg' }))).status).toBe(403);
  });

  it('answers 400, not 500, when the key can not be stored', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    // The order's folder already holds its sealed photo, so a file can't take the folder's name.
    const response = await put(signedUrl({ b: 'orderImages', k: `${BRAND}/${ORDER}`, op: 'put', ct: 'image/jpeg' }));
    expect(response.status).toBe(400);
    expect(log).toHaveBeenCalledOnce();
  });
});
