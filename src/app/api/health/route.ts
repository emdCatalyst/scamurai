import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Health check for uptime monitoring (a Cloud Monitoring uptime check, with
 * an alert when it fails): the server answers and the database replies
 * within 2 s. Says nothing but up or down.
 */
export const dynamic = "force-dynamic";

const DB_TIMEOUT_MS = 2_000;
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      db.execute(sql`select 1`),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`no answer within ${DB_TIMEOUT_MS} ms`)), DB_TIMEOUT_MS);
      }),
    ]);
    return Response.json({ ok: true, dbMs: Date.now() - started }, { headers: NO_STORE });
  } catch (err) {
    console.error("[health] database check failed:", err instanceof Error ? err.message : err);
    return Response.json({ ok: false }, { status: 503, headers: NO_STORE });
  } finally {
    clearTimeout(timer);
  }
}
