"use server";

import { db } from "@/lib/db";
import { deliveryAppCatalog } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { isCatalogLogoPath } from "@/lib/storage/keys";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

export async function createCatalogApp({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl?: string;
}) {
  try {
    await requireAuth(["master_admin"]);

    if (!name || name.length < 2 || name.length > 60) {
      return { success: false, error: "Name must be between 2 and 60 characters" };
    }

    if (logoUrl && !isCatalogLogoPath(logoUrl)) {
      return { success: false, error: "Invalid logo" };
    }

    // Check uniqueness
    const existing = await db.query.deliveryAppCatalog.findFirst({
      where: eq(deliveryAppCatalog.name, name),
    });

    if (existing) {
      return { success: false, error: "A platform with this name already exists" };
    }

    const [app] = await db
      .insert(deliveryAppCatalog)
      .values({
        name,
        logoUrl,
      })
      .returning();

    revalidatePath("/[adminSlug]/delivery-apps", "page");
    return { success: true, id: app.id };
  } catch (error) {
    console.error("Error creating catalog app:", error);
    return { success: false, error: "Failed to create platform" };
  }
}
