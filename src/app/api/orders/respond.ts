import { NextResponse } from "next/server";
import { ORDER_ERROR_STATUS, type OrderErrorBody, type OrderErrorCode, type OrderInputField } from "@/lib/orders/errors";

/** An order API's refusal: `{ error, code, field? }` with the code's HTTP status. */
export function orderError(code: OrderErrorCode, error: string, field?: OrderInputField) {
  const body: OrderErrorBody = field ? { error, code, field } : { error, code };
  return NextResponse.json(body, { status: ORDER_ERROR_STATUS[code] });
}
