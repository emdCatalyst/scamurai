"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { countNonDeletedUsers, getBrandUserLimit } from "@/lib/queries/brandUsers";
import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { brandUserSchema } from "@/lib/validations/brandUser";
import { sendEmail } from "@/lib/email";
import {
  renderEmail,
  emailHeading,
  emailParagraph,
  emailCallout,
  emailButton,
  emailMutedNote,
} from "@/lib/email-templates";

function generateTempPassword() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let pwd = "";
  for (let i = 0; i < 16; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Ensure it meets standard complexity
  pwd += "A1!";
  return pwd;
}

export async function createBrandUser(data: {
  fullName: string;
  email: string;
  role: "finance" | "staff";
  branchId?: string | null;
}) {
  try {
    const { brandId, userId: adminClerkId } = await requireAuth(["brand_admin"]);
    if (!brandId) return { success: false, error: "Unauthorized" };

    const parsed = brandUserSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
    }

    const { fullName, email, role } = parsed.data;
    const branchId = parsed.data.branchId;

    // 2. Plan Limit Check
    const userCount = await countNonDeletedUsers(brandId);
    const limit = await getBrandUserLimit(brandId);
    if (userCount >= limit) {
      return { success: false, error: "plan_limit", limit };
    }

    // Fetch internal admin user to record who invited this user
    const adminUser = await db.query.users.findFirst({
      where: eq(users.clerkUserId, adminClerkId),
      columns: { id: true }
    });

    // Check DB for existing user
    const existingDbUser = await db.query.users.findFirst({
      where: and(eq(users.email, email), isNull(users.deletedAt)),
    });
    if (existingDbUser) {
      return { success: false, error: "User with this email already exists" };
    }

    const tempPassword = generateTempPassword();

    // 4. Create Clerk User
    const client = await clerkClient();
    let clerkUser;
    try {
      clerkUser = await client.users.createUser({
        emailAddress: [email],
        password: tempPassword,
        firstName: fullName.split(" ")[0],
        lastName: fullName.split(" ").slice(1).join(" ") || undefined,
        publicMetadata: {
          role,
          brandId,
          branchId: branchId || null,
          mustChangePassword: true,
          userIsActive: true,
          brandIsActive: true,
        },
      });
    } catch (e: unknown) {
      const clerkError = e as { errors?: { longMessage: string }[] };
      console.error("Clerk user creation failed:", e);
      return { success: false, error: clerkError.errors?.[0]?.longMessage || "Failed to create authentication user" };
    }

    // 5. Insert DB row
    try {
      await db.insert(users).values({
        email,
        fullName,
        role,
        brandId,
        branchId: branchId || null,
        clerkUserId: clerkUser.id,
        isActive: true,
        onboardingComplete: true,
        invitedBy: adminUser?.id || null,
      });
    } catch (e) {
      console.error("DB user insertion failed:", e);
      // Rollback clerk creation
      await client.users.deleteUser(clerkUser.id).catch(console.error);
      return { success: false, error: "Database error while creating user" };
    }

    // 6. Send Email via Resend
    try {
      const appUrl = (
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      ).replace(/\/$/, "");

      const html = renderEmail({
        preheader: `Your Scamurai account is ready. Temporary password inside.`,
        bodyHtml: [
          emailHeading("Welcome to Scamurai"),
          emailParagraph(`Hi ${fullName},`),
          emailParagraph(
            "Your Scamurai account has been created. Use the temporary password below to sign in. You'll be prompted to set a permanent password on your first login."
          ),
          emailCallout("Temporary password", tempPassword),
          emailButton(appUrl, "Sign in to Scamurai"),
          emailMutedNote(
            "If you weren't expecting this email, please contact your brand administrator. Treat this password like cash — never share it with anyone."
          ),
        ].join("\n"),
      });

      await sendEmail({
        to: email,
        subject: "Welcome to Scamurai — your account is ready",
        html,
      });
      console.log(`[createBrandUser] Welcome email sent to ${email}`);
    } catch (emailErr) {
      console.error("[createBrandUser] Failed to send welcome email:", emailErr);
      // We don't fail the whole action if only email fails, but we log it.
    }

    revalidatePath("/[locale]/brands/[brandSlug]/(authenticated)/users", "page");
    return { success: true };
  } catch (error) {
    console.error("Error creating brand user:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
