"use server";

import { db } from "@/lib/db";
import { deliveryAppCatalog } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { eq, and, isNull } from "drizzle-orm";

export async function setCatalogAppStatus({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  try {
    await requireAuth(["master_admin"]);

    const existing = await db.query.deliveryAppCatalog.findFirst({
      where: and(eq(deliveryAppCatalog.id, id), isNull(deliveryAppCatalog.deletedAt)),
    });

    if (!existing) {
      return { success: false, error: "Platform not found" };
    }

    if (existing.isActive === isActive) {
      return { success: true };
    }

    await db
      .update(deliveryAppCatalog)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(deliveryAppCatalog.id, id));

    revalidatePath("/[adminSlug]/delivery-apps", "page");
    return { success: true };
  } catch (error) {
    console.error("Error setting catalog app status:", error);
    return { success: false, error: "Failed to update platform status" };
  }
}
