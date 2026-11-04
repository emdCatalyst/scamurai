import { afterEach, describe, expect, it, vi } from 'vitest';

const getSignedUrl = vi.fn();
const exists = vi.fn();
vi.mock('@google-cloud/storage', () => ({
  Storage: class {
    bucket() {
      return { file: () => ({ getSignedUrl, exists }) };
    }
  },
}));

const { createGcsDriver, withTimeout } = await import('./gcsDriver');
const BUCKETS = { orderImages: 'orders-bucket', brandAssets: 'assets-bucket' };

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  getSignedUrl.mockReset();
  exists.mockReset();
});

describe('withTimeout', () => {
  it('passes a result through', async () => {
    await expect(withTimeout('x', Promise.resolve(7), 50)).resolves.toBe(7);
  });

  it('gives up on a call that hangs', async () => {
    await expect(withTimeout('signing', new Promise(() => {}), 10)).rejects.toThrow('signing timed out after 10 ms');
  });
});

describe('createGcsDriver', () => {
  it('reuses a read URL for half its lifetime instead of signing again', async () => {
    vi.useFakeTimers();
    getSignedUrl.mockResolvedValueOnce(['https://signed/1']).mockResolvedValueOnce(['https://signed/2']);
    const storage = createGcsDriver(BUCKETS);

    expect(await storage.createReadUrl('orderImages', 'b/o/sealed.jpg', { expiresInSeconds: 600 })).toBe('https://signed/1');
    vi.advanceTimersByTime(299_000);
    expect(await storage.createReadUrl('orderImages', 'b/o/sealed.jpg', { expiresInSeconds: 600 })).toBe('https://signed/1');
    expect(getSignedUrl).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(2_000);
    expect(await storage.createReadUrl('orderImages', 'b/o/sealed.jpg', { expiresInSeconds: 600 })).toBe('https://signed/2');
  });

  it('fails an upload URL that IAM never signs, so the phone retries', async () => {
    vi.useFakeTimers();
    getSignedUrl.mockReturnValue(new Promise(() => {}));
    const storage = createGcsDriver(BUCKETS);

    const url = storage.createUploadUrl('orderImages', 'b/o/sealed.jpg', { contentType: 'image/jpeg', maxBytes: 10, expiresInSeconds: 60 });
    const failed = expect(url).rejects.toThrow('upload URL timed out');
    await vi.advanceTimersByTimeAsync(8_000);
    await failed;
  });

  it('logs slow signing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.useFakeTimers();
    getSignedUrl.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(['https://signed']), 1_500)));
    const storage = createGcsDriver(BUCKETS);

    const url = storage.createUploadUrl('orderImages', 'b/o/opened.jpg', { contentType: 'image/jpeg', maxBytes: 10, expiresInSeconds: 60 });
    await vi.advanceTimersByTimeAsync(1_500);
    expect((await url).url).toBe('https://signed');
    expect(warn).toHaveBeenCalledWith('[storage] slow URL signing', expect.stringContaining('"ms":1500'));
  });
});
