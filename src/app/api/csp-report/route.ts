import { readBody } from '@/lib/readBody';
import { parseCspReports } from '@/lib/security/cspReport';

/**
 * Content-Security-Policy violation reports (src/lib/security/csp.ts). Each
 * violation becomes one `[csp]` log line. Always answers 204: browsers ignore
 * the response, and other senders learn nothing.
 */

const MAX_BODY_BYTES = 16 * 1024;
const NO_CONTENT = () => new Response(null, { status: 204 });

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
