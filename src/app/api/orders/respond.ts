import { NextResponse } from "next/server";
import { DrizzleQueryError } from "drizzle-orm";
import { ORDER_ERROR_STATUS, type OrderErrorBody, type OrderErrorCode, type OrderInputField } from "@/lib/orders/errors";
import { readBody } from "@/lib/readBody";

/** An order API's refusal: `{ error, code, field? }` with the code's HTTP status. */
export function orderError(code: OrderErrorCode, error: string, field?: OrderInputField) {
  const body: OrderErrorBody = field ? { error, code, field } : { error, code };
  return NextResponse.json(body, { status: ORDER_ERROR_STATUS[code] });
}

/** The request body as JSON; undefined when it is missing, longer than `limit` bytes, or not JSON. */
export async function readJson(req: Request, limit: number): Promise<unknown> {
  const text = await readBody(req, limit);
  if (text === null) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * What to log for a failed query. Drizzle wraps the driver's error in one
 * whose message lists the query parameters, i.e. what the phone sent (notes
 * may hold line breaks that would read as log lines of their own).
 */
export function queryCause(err: unknown): unknown {
  return err instanceof DrizzleQueryError && err.cause ? err.cause : err;
}

/** A unique index refused the row (Postgres 23505). */
export function isUniqueViolation(err: unknown): boolean {
  return (queryCause(err) as { code?: unknown } | null)?.code === "23505";
}
