"use server";

import { db } from "@/lib/db";
import { brands, users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { clerkClient } from "@clerk/nextjs/server";

export async function setBrandStatus({
  brandId,
  isActive,
}: {
  brandId: string;
  isActive: boolean;
}) {
  try {
    // 1. requireAuth(['master_admin'])
    await requireAuth(["master_admin"]);

    // 2. Fetch brand by id
    const brand = await db.query.brands.findFirst({
      where: and(eq(brands.id, brandId)),
    });

    if (!brand || brand.deletedAt) {
      return { success: false, error: "Brand not found" };
    }

    // 3. If isActive already matches target state — return early
    if (brand.isActive === isActive) {
      return { success: true };
    }

    // 4. UPDATE brands SET is_active = targetState, updated_at = now()
    await db
      .update(brands)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(brands.id, brandId));

    // 5. Update Clerk metadata for all brand users
    const brandUsers = await db.query.users.findMany({
      where: and(eq(users.brandId, brandId), isNull(users.deletedAt)),
      columns: { clerkUserId: true }
    });

    const client = await clerkClient();
    await Promise.all(
      brandUsers
        .filter(u => u.clerkUserId)
        .map(u => 
          client.users.updateUserMetadata(u.clerkUserId!, {
            publicMetadata: {
              brandIsActive: isActive
            }
          })
        )
    );

    // 6. Send notification email to brand_admin email via Resend
    const brandAdmin = await db.query.users.findFirst({
      where: and(eq(users.brandId, brandId), eq(users.role, "brand_admin")),
    });

    if (brandAdmin?.email) {
      try {
        const t = await getTranslations("admin.brands.email");

        const subject = isActive
          ? t("activationSubject")
          : t("suspensionSubject");

        const body = isActive
          ? t("activationBody", { brandName: brand.name })
          : t("suspensionBody", { brandName: brand.name });

        await sendEmail({
          from: 'Scamurai <onboarding@resend.dev>',
          to: brandAdmin.email,
          subject,
          text: body,
        });
      } catch (emailError) {
        console.error("Failed to send status update email:", emailError);
        // Do NOT fail the action if email fails
      }
    }

    revalidatePath("/[adminSlug]/brands", "page");
    return { success: true };
  } catch (error) {
    console.error("Error setting brand status:", error);
    return { success: false, error: "Failed to update brand status" };
  }
}
