"use server";

import { db } from "@/lib/db";
import { deliveryAppCatalog, brandDeliveryApps } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { eq, and, isNull, count } from "drizzle-orm";

export async function deleteCatalogApp({ id }: { id: string }) {
  try {
    await requireAuth(["master_admin"]);

    const existing = await db.query.deliveryAppCatalog.findFirst({
      where: and(eq(deliveryAppCatalog.id, id), isNull(deliveryAppCatalog.deletedAt)),
    });

    if (!existing) {
      return { success: false, error: "Platform not found" };
    }

    // Check usage by brands
    const [usageResult] = await db
      .select({ count: count() })
      .from(brandDeliveryApps)
      .where(eq(brandDeliveryApps.catalogAppId, id));

    const brandCount = Number(usageResult.count);

    if (brandCount > 0) {
      return {
        success: false,
        error: `Platform is in use by ${brandCount} brand(s). Disable it from those brands first.`,
      };
    }

    await db
      .update(deliveryAppCatalog)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(deliveryAppCatalog.id, id));

    revalidatePath("/[adminSlug]/delivery-apps", "page");
    return { success: true };
  } catch (error) {
    console.error("Error deleting catalog app:", error);
    return { success: false, error: "Failed to delete platform" };
  }
}
