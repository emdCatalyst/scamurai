'use server';

import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { brandDeliveryApps, deliveryAppCatalog } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function setDeliveryAppStatus(catalogAppId: string, active: boolean) {
  const { brandId } = await requireAuth(['brand_admin']);

  if (!brandId) {
    return { success: false, error: 'unauthorized' };
  }

  try {
    // 1. Verify the catalog app exists and is not deleted
    const [catalogApp] = await db
      .select()
      .from(deliveryAppCatalog)
      .where(and(
        eq(deliveryAppCatalog.id, catalogAppId),
        isNull(deliveryAppCatalog.deletedAt)
      ))
      .limit(1)
      .execute();

    if (!catalogApp) {
      return { success: false, error: 'App not found in catalog' };
    }

    // 2. Perform upsert
    await db
      .insert(brandDeliveryApps)
      .values({
        brandId,
        catalogAppId,
        isActive: active,
      })
      .onConflictDoUpdate({
        target: [brandDeliveryApps.brandId, brandDeliveryApps.catalogAppId],
        set: {
          isActive: active,
          updatedAt: new Date(),
        },
      })
      .execute();

    revalidatePath(`/brands`, 'layout');
    return { success: true };
  } catch (err) {
    console.error('[setDeliveryAppStatus] Error:', err);
    return { success: false, error: 'failed' };
  }
}
