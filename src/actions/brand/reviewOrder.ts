"use server";

import { db } from "@/lib/db";
import { orders, users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

type ReviewDecision = "approve" | "reject";

const MAX_REJECTION_REASON_LENGTH = 500;

export async function reviewOrder({
  orderId,
  decision,
  rejectionReason,
}: {
  orderId: string;
  decision: ReviewDecision;
  rejectionReason?: string;
}) {
  try {
    const { userId, brandId: authBrandId } = await requireAuth([
      "finance",
      "brand_admin",
    ]);

    if (!authBrandId) {
      return { success: false as const, error: "Unauthorized" };
    }

    let trimmedReason: string | null = null;
    if (decision === "reject") {
      trimmedReason = (rejectionReason ?? "").trim();
      if (!trimmedReason) {
        return { success: false as const, error: "Rejection reason is required" };
      }
      if (trimmedReason.length > MAX_REJECTION_REASON_LENGTH) {
        return { success: false as const, error: "Rejection reason is too long" };
      }
    }

    // `userId` from requireAuth is the Clerk id; orders.reviewedBy → users.id
    // (internal UUID), so look up the internal user record first.
    const reviewer = await db.query.users.findFirst({
      where: eq(users.clerkUserId, userId),
      columns: { id: true },
    });

    if (!reviewer) {
      return { success: false as const, error: "Reviewer not found" };
    }

    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, orderId),
        eq(orders.brandId, authBrandId),
        isNull(orders.deletedAt)
      ),
      columns: { id: true, status: true },
    });

    if (!order) {
      return { success: false as const, error: "Order not found" };
    }

    if (order.status !== "needs_review") {
      return { success: false as const, error: "Order has already been reviewed" };
    }

    const now = new Date();
    await db
      .update(orders)
      .set({
        status: decision === "approve" ? "approved" : "rejected",
        reviewedBy: reviewer.id,
        reviewedAt: now,
        rejectionReason: decision === "reject" ? trimmedReason : null,
        updatedAt: now,
      })
      .where(eq(orders.id, orderId));

    revalidatePath("/[locale]/brands/[brandSlug]/orders", "page");
    return { success: true as const };
  } catch (error) {
    console.error("Error reviewing order:", error);
    return { success: false as const, error: "Failed to review order" };
  }
}
