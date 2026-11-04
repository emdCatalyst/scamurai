import { describe, expect, it } from "vitest";
import type { PendingOrder } from "@/lib/staff/orderStore";
import {
  amountPreview,
  draftFromOrder,
  DRAFT_FRESH_MS,
  failedReason,
  fieldsToFix,
  hasOrder,
  isFresh,
  isOldPhoto,
  missingItem,
  orderFromForm,
  retryCanHelp,
  type FormState,
} from "./orderForm";

const complete: FormState = {
  wrongAccount: false,
  preparing: false,
  opened: true,
  sealed: true,
  apps: [{ id: "app-1" }],
  deliveryAppId: "app-1",
  orderNumber: "4512",
  amount: "37.95",
};

const blob = (text: string) => new Blob([text]);

describe("missingItem", () => {
  it("is null once everything is there", () => {
    expect(missingItem(complete)).toBeNull();
  });

  it("names the first thing still missing, in the order of the form", () => {
    const empty: FormState = { ...complete, opened: false, sealed: false, deliveryAppId: "", orderNumber: "", amount: "" };
    expect(missingItem(empty)).toBe("needOpenedPhoto");
    expect(missingItem({ ...empty, opened: true })).toBe("needSealedPhoto");
    expect(missingItem({ ...empty, opened: true, sealed: true })).toBe("needDeliveryApp");
    expect(missingItem({ ...complete, orderNumber: "  " })).toBe("needOrderNumber");
    expect(missingItem({ ...complete, amount: "" })).toBe("needAmount");
  });

  it("says first what nothing on the form can fix", () => {
    expect(missingItem({ ...complete, opened: false, wrongAccount: true })).toBe("wrongAccount");
    expect(missingItem({ ...complete, opened: false, apps: [] })).toBe("noDeliveryApps");
    expect(missingItem({ ...complete, preparing: true })).toBe("preparingPhoto");
  });

  it("doesn't count a delivery app the brand no longer offers", () => {
    expect(missingItem({ ...complete, deliveryAppId: "app-turned-off" })).toBe("needDeliveryApp");
  });

  it("reads the order number like the server", () => {
    expect(missingItem({ ...complete, orderNumber: "#" })).toBe("needOrderNumber");
    expect(missingItem({ ...complete, orderNumber: "١٢٣٤" })).toBeNull();
    expect(missingItem({ ...complete, orderNumber: "12<34" })).toBe("orderNumberInvalid");
    expect(missingItem({ ...complete, orderNumber: "1".repeat(41) })).toBe("orderNumberInvalid");
  });

  it("reads the amount like the server, Arabic digits and decimal commas included", () => {
    for (const amount of ["37.95", "37,95", "٣٧٫٩٥", "1,250", "0"]) expect(missingItem({ ...complete, amount })).toBeNull();
    for (const amount of ["-25", "1e5", "37.955", "abc", "12345678901"]) {
      expect(missingItem({ ...complete, amount })).toBe("amountInvalid");
    }
  });
});

describe("amountPreview", () => {
  it("shows the saved amount only when it isn't plainly what was typed", () => {
    expect(amountPreview("37,95")).toBe("37.95");
    expect(amountPreview("37٫95")).toBe("37.95");
    expect(amountPreview("1,250")).toBe("1250.00");
    expect(amountPreview(".5")).toBe("0.50");
    for (const typed of ["37", "37.5", "37.50", " 37.50 ", "", "abc"]) expect(amountPreview(typed)).toBeNull();
  });
});

describe("drafts", () => {
  const now = Date.UTC(2026, 10, 4, 12);
  const draft = { id: "user_a:demo", orderNumber: "", amount: "", notes: "", deliveryAppId: "app-1" };

  it("holds an order only with something besides the delivery app", () => {
    expect(hasOrder(draft)).toBe(false);
    expect(hasOrder({ ...draft, notes: "  " })).toBe(false);
    expect(hasOrder({ ...draft, openedBlob: blob("o") })).toBe(true);
    expect(hasOrder({ ...draft, amount: "5" })).toBe(true);
  });

  it("comes back unasked for 30 minutes, and never when its age is unknown", () => {
    expect(isFresh({ ...draft, savedAt: now - DRAFT_FRESH_MS }, now)).toBe(true);
    expect(isFresh({ ...draft, savedAt: now - DRAFT_FRESH_MS - 1 }, now)).toBe(false);
    expect(isFresh(draft, now)).toBe(false);
    // The phone's clock was set back by hours.
    expect(isFresh({ ...draft, savedAt: now + 3 * 60 * 60_000 }, now)).toBe(false);
  });
});

describe("isOldPhoto", () => {
  const now = Date.UTC(2026, 10, 4, 12);

  it("flags a photo file from more than 10 minutes ago", () => {
    expect(isOldPhoto(now - 11 * 60_000, now)).toBe(true);
    expect(isOldPhoto(now - 60_000, now)).toBe(false);
  });

  it("says nothing when the phone gives no time", () => {
    expect(isOldPhoto(0, now)).toBe(false);
    expect(isOldPhoto(Number.NaN, now)).toBe(false);
  });
});

describe("orderFromForm", () => {
  const owner = { userId: "user_a", brandId: "brand-1", brandSlug: "demo" };
  const photos = { sealedBlob: blob("s"), openedBlob: blob("o") };

  it("saves what the server will store: Latin digits, upper case, the amount with two decimals", () => {
    const order = orderFromForm(
      { orderNumber: " #hs-٤٥١٢ ", amount: "٣٧٫٩٥", notes: "  ", deliveryAppId: "app-1", ...photos },
      owner,
      { id: "id-1", createdAt: 5 }
    );
    expect(order).toMatchObject({
      id: "id-1",
      userId: "user_a",
      orderNumber: "HS-4512",
      subtotal: "37.95",
      currency: "SAR",
      notes: undefined,
      createdAt: 5,
      attempts: 0,
    });
    expect(order).not.toHaveProperty("failed");
  });

  it("refuses an amount it can't read", () => {
    expect(orderFromForm({ orderNumber: "1", amount: "3,7,9", notes: "", deliveryAppId: "a", ...photos }, owner, { id: "x", createdAt: 1 })).toBeNull();
  });
});

describe("correcting a refused order", () => {
  const refused: PendingOrder = {
    id: "order-1",
    userId: "user_a",
    brandId: "brand-1",
    brandSlug: "demo",
    orderNumber: "4512",
    deliveryAppId: "app-1",
    subtotal: "37.95",
    currency: "SAR",
    sealedBlob: blob("s"),
    openedBlob: blob("o"),
    createdAt: 100,
    attempts: 1,
    failed: true,
    lastError: "upload-urls: Order number already exists for this branch",
    errorCode: "duplicate_order",
  };

  it("loads it into the form with its photos, keeping its id and capture time", () => {
    const draft = draftFromOrder(refused, "user_a:demo", 500);
    expect(draft).toMatchObject({
      id: "user_a:demo",
      orderNumber: "4512",
      amount: "37.95",
      notes: "",
      deliveryAppId: "app-1",
      savedAt: 500,
      correcting: { id: "order-1", createdAt: 100, orderNumber: "4512", errorCode: "duplicate_order" },
    });
    expect(draft.sealedBlob).toBe(refused.sealedBlob);
    expect(hasOrder(draft)).toBe(true);
  });

  it("points at the fields the refusal is about", () => {
    expect([...fieldsToFix(draftFromOrder(refused, "d", 1).correcting)]).toEqual(["orderNumber", "deliveryAppId"]);
    const invalidAmount = draftFromOrder({ ...refused, errorCode: "invalid_input", errorField: "subtotal" }, "d", 1);
    expect([...fieldsToFix(invalidAmount.correcting)]).toEqual(["subtotal"]);
    expect(fieldsToFix(undefined).size).toBe(0);
  });

  it("explains every refusal, and offers sending again only where the office can fix the cause", () => {
    expect(failedReason("duplicate_order")).toBe("duplicate_order");
    expect(failedReason("photos_missing")).toBe("other");
    expect(failedReason(undefined)).toBe("other");
    expect(retryCanHelp("no_branch")).toBe(true);
    expect(retryCanHelp("duplicate_order")).toBe(false);
    expect(retryCanHelp("invalid_input")).toBe(false);
  });
});
