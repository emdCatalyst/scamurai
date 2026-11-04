import { parseCspReports } from '@/lib/security/cspReport';

/**
 * Content-Security-Policy violation reports (src/lib/security/csp.ts). Each
 * violation becomes one `[csp]` log line. Always answers 204: browsers ignore
 * the response, and other senders learn nothing.
 */

const MAX_BODY_BYTES = 16 * 1024;
const NO_CONTENT = () => new Response(null, { status: 204 });

/** The body as text, or null once it grows past `limit` bytes. */
async function readBody(request: Request, limit: number): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function POST(request: Request) {
  const body = await readBody(request, MAX_BODY_BYTES);
  if (!body) return NO_CONTENT();

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NO_CONTENT();
  }

  for (const violation of parseCspReports(payload, process.env.ADMIN_SLUG)) {
    console.warn('[csp]', JSON.stringify(violation));
  }
  return NO_CONTENT();
}
