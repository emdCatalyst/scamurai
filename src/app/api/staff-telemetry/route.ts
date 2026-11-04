import { auth } from "@clerk/nextjs/server";
import { readBody } from "@/lib/readBody";
import { parseTelemetry } from "@/lib/telemetry";

/**
 * Reports from staff phones (src/lib/telemetry.ts), one `[telemetry]` log
 * line each: page speed on real devices, and orders stuck on a phone.
 * Signed-in users only. Always 204 otherwise: nothing to read back.
 */

const MAX_BODY_BYTES = 2 * 1024;
const NO_CONTENT = () => new Response(null, { status: 204 });

export async function POST(req: Request) {
  const { userId, sessionClaims } = await auth();
  if (!userId) return new Response(null, { status: 401 });

  const body = await readBody(req, MAX_BODY_BYTES);
  if (!body) return NO_CONTENT();

  let report;
  try {
    report = parseTelemetry(JSON.parse(body));
  } catch {
    return NO_CONTENT();
  }
  if (report) {
    const brandId = sessionClaims?.metadata?.brandId ?? null;
    console.info("[telemetry]", JSON.stringify({ ...report, brandId, userId }));
  }
  return NO_CONTENT();
}
