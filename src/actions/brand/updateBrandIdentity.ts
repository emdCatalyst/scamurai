'use server';

import { requireAuth } from "@/lib/auth";
import { isBrandLogoPath } from "@/lib/storage/keys";
import { db } from "@/lib/db";
import { brands } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { brandIdentitySchema } from "@/lib/validations/brandSettings";

export async function updateBrandIdentity(data: {
  name: string;
  logoUrl: string | null;
  brandColors: {
    primary: string;
    background: string;
    surface: string;
    textAccent: string;
  };
}) {
  const { brandId } = await requireAuth(["brand_admin"]);
  if (!brandId) return { success: false, error: "Unauthorized" };

  const parsed = brandIdentitySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  // Only the validated copy is saved: it leaves out keys the schema doesn't know.
  const { name, logoUrl, brandColors } = parsed.data;
  // A logo must be one uploaded for this brand, never another brand's file.
  if (logoUrl && !isBrandLogoPath(logoUrl, brandId)) {
    return { success: false, error: "Invalid logo" };
  }

  try {
    const brand = await db.query.brands.findFirst({
      where: eq(brands.id, brandId),
    });

    if (!brand) return { success: false, error: "Brand not found" };

    await db
      .update(brands)
      .set({
        name,
        logoUrl,
        brandColors,
        updatedAt: new Date(),
      })
      .where(eq(brands.id, brandId));

    revalidatePath(`/brands/${brand.slug}/settings`);
    revalidatePath(`/`, "layout"); // Update global colors if used in layout

    return { success: true };
  } catch (error) {
    console.error("Failed to update brand identity:", error);
    return { success: false, error: "Failed to update brand identity" };
  }
}
