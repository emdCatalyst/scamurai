import { afterEach, describe, expect, it, vi } from 'vitest';

const session = vi.hoisted(() => ({ current: { userId: 'user_1' as string | null, sessionClaims: { metadata: { brandId: 'brand-1' } } } }));
vi.mock('@clerk/nextjs/server', () => ({ auth: async () => session.current }));

const { POST } = await import('./route');
const post = (body: string) => POST(new Request('http://localhost/api/staff-telemetry', { method: 'POST', body }));

describe('POST /api/staff-telemetry', () => {
  afterEach(() => vi.restoreAllMocks());

  it('logs a valid report with who sent it', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    const response = await post(JSON.stringify({ type: 'outbox', waiting: 2, failed: 0, oldestWaitingSec: 900 }));
    expect(response.status).toBe(204);
    expect(JSON.parse(log.mock.calls[0][1] as string)).toEqual({
      type: 'outbox',
      waiting: 2,
      failed: 0,
      oldestWaitingSec: 900,
      brandId: 'brand-1',
      userId: 'user_1',
    });
  });

  it('ignores junk and oversized bodies, and refuses anonymous senders', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    expect((await post('not json')).status).toBe(204);
    expect((await post(JSON.stringify({ type: 'vitals', name: 'LCP', value: 1, pad: 'x'.repeat(4096) }))).status).toBe(204);
    expect(log).not.toHaveBeenCalled();

    session.current = { ...session.current, userId: null };
    expect((await post('{}')).status).toBe(401);
  });

  it('stops logging for a user who sends too many reports', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    session.current = { ...session.current, userId: 'user_flood' };
    const report = JSON.stringify({ type: 'vitals', name: 'LCP', value: 1200 });
    const statuses = [];
    for (let i = 0; i < 121; i++) statuses.push((await post(report)).status);
    expect(statuses.slice(0, 120).every((status) => status === 204)).toBe(true);
    expect(statuses[120]).toBe(429);
    expect(log).toHaveBeenCalledTimes(120);

    session.current = { ...session.current, userId: 'user_other' };
    expect((await post(report)).status).toBe(204);
  });
});
