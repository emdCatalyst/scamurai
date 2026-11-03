import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { contentHash, sniffImage } from './images';
import {
  brandLogoKey,
  catalogLogoKey,
  isBrandLogoPath,
  isCatalogLogoPath,
  isPublicAssetKey,
  mediaPath,
  orderImageKey,
} from './keys';
import { createLocalDriver } from './localDriver';

const BRAND = '0f8b7c2e-1d2a-4b3c-8d4e-5f6a7b8c9d0e';
const OTHER_BRAND = '1a2b3c4d-5e6f-4a1b-8c2d-3e4f5a6b7c8d';
const ORDER = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const HASH = '0123456789abcdef';

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const SVG = new TextEncoder().encode('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>');

describe('storage keys', () => {
  it('builds order image keys from validated ids only', () => {
    expect(orderImageKey(BRAND, ORDER, 'sealed')).toBe(`${BRAND}/${ORDER}/sealed.jpg`);
    expect(() => orderImageKey('../other', ORDER, 'sealed')).toThrow();
    expect(() => orderImageKey(BRAND, 'x/../y', 'opened')).toThrow();
  });

  it('accepts only well-formed public asset keys', () => {
    const brandKey = brandLogoKey(BRAND, HASH, 'png');
    expect(isPublicAssetKey(brandKey)).toBe(true);
    expect(isPublicAssetKey(catalogLogoKey(HASH, 'svg'))).toBe(true);
    for (const bad of ['../etc/passwd', `brands/${BRAND}/../../x.png`, `${BRAND}/${ORDER}/sealed.jpg`, 'brands/x/logo-zz.png']) {
      expect(isPublicAssetKey(bad)).toBe(false);
    }
  });

  it('ties brand logos to their brand', () => {
    const logo = mediaPath(brandLogoKey(BRAND, HASH, 'jpg'));
    expect(isBrandLogoPath(logo, BRAND)).toBe(true);
    expect(isBrandLogoPath(logo, OTHER_BRAND)).toBe(false);
    expect(isBrandLogoPath('https://evil.example/logo.png', BRAND)).toBe(false);
    expect(isCatalogLogoPath(mediaPath(catalogLogoKey(HASH, 'png')))).toBe(true);
    expect(isCatalogLogoPath(logo)).toBe(false);
  });
});

describe('image sniffing', () => {
  it('trusts bytes, not file names or declared types', () => {
    expect(sniffImage(PNG)?.ext).toBe('png');
    expect(sniffImage(JPEG)?.ext).toBe('jpg');
    expect(sniffImage(SVG)?.ext).toBe('svg');
    expect(sniffImage(new TextEncoder().encode('<html><script>alert(1)</script>'))).toBeNull();
    expect(sniffImage(new Uint8Array([1, 2, 3]))).toBeNull();
  });

  it('hashes content into a 16-hex key segment', () => {
    expect(contentHash(PNG)).toMatch(/^[0-9a-f]{16}$/);
    expect(contentHash(PNG)).toBe(contentHash(PNG));
    expect(contentHash(PNG)).not.toBe(contentHash(JPEG));
  });
});

describe('local storage driver', () => {
  let root: string;
  let driver: ReturnType<typeof createLocalDriver>;
  const tokenOf = (url: string) => new URL(url, 'http://localhost').searchParams.get('token')!;

  beforeAll(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'scamurai-storage-'));
    driver = createLocalDriver({ rootDir: root, secret: 'test-secret' });
  });
  afterAll(() => rm(root, { recursive: true, force: true }));

  it('stores and reads objects', async () => {
    const key = brandLogoKey(BRAND, HASH, 'png');
    await driver.put('brandAssets', key, PNG, { contentType: 'image/png' });
    expect(await driver.exists('brandAssets', key)).toBe(true);
    expect(await driver.get('brandAssets', key)).toEqual({ body: PNG, contentType: 'image/png' });
    expect(await driver.get('brandAssets', 'missing.png')).toBeNull();
  });

  it('signs upload URLs for one object, one operation, with a size cap', async () => {
    const key = orderImageKey(BRAND, ORDER, 'sealed');
    const target = await driver.createUploadUrl('orderImages', key, { contentType: 'image/jpeg', maxBytes: 4, expiresInSeconds: 60 });
    expect(target).toMatchObject({ method: 'PUT', headers: { 'Content-Type': 'image/jpeg' } });

    const payload = driver.verifyToken(tokenOf(target.url), 'put');
    expect(payload).toMatchObject({ b: 'orderImages', k: key, ct: 'image/jpeg', max: 4 });
    expect(driver.verifyToken(tokenOf(target.url), 'get')).toBeNull(); // wrong operation

    await expect(driver.write(payload!, JPEG)).rejects.toThrow(/too large/);
    await driver.write(payload!, JPEG.subarray(0, 4));
    expect(await driver.exists('orderImages', key)).toBe(true);
  });

  it('rejects tampered, foreign and expired tokens', async () => {
    const read = await driver.createReadUrl('orderImages', orderImageKey(BRAND, ORDER, 'sealed'), { expiresInSeconds: 60 });
    const token = tokenOf(read);
    const [body, mac] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ b: 'orderImages', k: orderImageKey(OTHER_BRAND, ORDER, 'sealed'), op: 'get', exp: 9e9 })).toString('base64url');

    expect(driver.verifyToken(token, 'get')).not.toBeNull();
    expect(driver.verifyToken(`${forged}.${mac}`, 'get')).toBeNull();
    expect(driver.verifyToken(`${body}.${mac.slice(1)}x`, 'get')).toBeNull();

    const otherSecret = createLocalDriver({ rootDir: root, secret: 'another-secret' });
    expect(otherSecret.verifyToken(token, 'get')).toBeNull();

    const expired = await driver.createReadUrl('orderImages', orderImageKey(BRAND, ORDER, 'opened'), { expiresInSeconds: -1 });
    expect(driver.verifyToken(tokenOf(expired), 'get')).toBeNull();
  });

  it('refuses keys that escape the bucket', async () => {
    await expect(driver.put('brandAssets', '../../outside.txt', PNG, { contentType: 'text/plain' })).rejects.toThrow();
    expect(await driver.exists('orderImages', '../brandAssets/x')).toBe(false);
  });
});
