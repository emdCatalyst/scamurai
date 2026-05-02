"use server";

import { db } from "@/lib/db";
import { deliveryAppCatalog } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { eq, and, isNull } from "drizzle-orm";

export async function updateCatalogApp({
  id,
  name,
  logoUrl,
}: {
  id: string;
  name: string;
  logoUrl?: string | null;
}) {
  try {
    await requireAuth(["master_admin"]);

    if (!name || name.length < 2 || name.length > 60) {
      return { success: false, error: "Name must be between 2 and 60 characters" };
    }

    // Check existence
    const existing = await db.query.deliveryAppCatalog.findFirst({
      where: and(eq(deliveryAppCatalog.id, id), isNull(deliveryAppCatalog.deletedAt)),
    });

    if (!existing) {
      return { success: false, error: "Platform not found" };
    }

    // Check uniqueness if name changed
    if (name !== existing.name) {
      const conflict = await db.query.deliveryAppCatalog.findFirst({
        where: and(eq(deliveryAppCatalog.name, name), isNull(deliveryAppCatalog.deletedAt)),
      });
      if (conflict) {
        return { success: false, error: "A platform with this name already exists" };
      }
    }

    // Build update payload dynamically
    const updatePayload: {
      name?: string;
      logoUrl?: string | null;
      updatedAt: Date;
    } = {
      updatedAt: new Date(),
    };

    let hasChanges = false;

    if (name !== existing.name) {
      updatePayload.name = name;
      hasChanges = true;
    }

    // Only update logo if explicitly provided (can be null to clear)
    if (logoUrl !== undefined && logoUrl !== existing.logoUrl) {
      updatePayload.logoUrl = logoUrl;
      hasChanges = true;
    }

    if (!hasChanges) {
      return { success: true };
    }

    await db
      .update(deliveryAppCatalog)
      .set(updatePayload)
      .where(eq(deliveryAppCatalog.id, id));

    revalidatePath("/[adminSlug]/delivery-apps", "page");
    return { success: true };
  } catch (error) {
    console.error("Error updating catalog app:", error);
    return { success: false, error: "Failed to update platform" };
  }
}
