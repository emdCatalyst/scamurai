import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

const report = (blocked: string) => ({ type: 'csp-violation', body: { effectiveDirective: 'script-src', blockedURL: blocked } });
const post = (body: unknown) => POST(new Request('http://localhost/api/csp-report', { method: 'POST', body: JSON.stringify(body) }));

describe('POST /api/csp-report', () => {
  afterEach(() => vi.restoreAllMocks());

  it('logs each violation, up to 60 lines a minute however much is posted', async () => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const response = await post([report('https://evil.example/x.js')]);
    expect(response.status).toBe(204);
    expect(log).toHaveBeenCalledWith('[csp]', expect.stringContaining('"blocked":"https://evil.example/x.js"'));

    for (let i = 0; i < 10; i++) expect((await post(Array.from({ length: 10 }, () => report('inline')))).status).toBe(204);
    expect(log).toHaveBeenCalledTimes(60);
  });
});
