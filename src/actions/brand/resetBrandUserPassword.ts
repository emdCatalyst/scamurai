"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireAuth, revokeAllSessionsForUser } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";
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

export async function resetBrandUserPassword({ userId }: { userId: string }) {
  try {
    const { brandId } = await requireAuth(["brand_admin"]);
    if (!brandId) return { success: false, error: "Unauthorized" };

    const user = await db.query.users.findFirst({
      where: and(eq(users.id, userId), eq(users.brandId, brandId), isNull(users.deletedAt)),
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (!user.clerkUserId) {
      return { success: false, error: "User is not linked to an authentication account" };
    }

    const tempPassword = generateTempPassword();
    const client = await clerkClient();

    try {
      await client.users.updateUser(user.clerkUserId, {
        password: tempPassword,
      });
      await client.users.updateUserMetadata(user.clerkUserId, {
        publicMetadata: {
          role: user.role,
          brandId,
          branchId: user.branchId || null,
          mustChangePassword: true,
        },
      });
    } catch (e: unknown) {
      const clerkError = e as { errors?: { longMessage: string }[] };
      console.error("Clerk password reset failed:", e);
      return { success: false, error: clerkError.errors?.[0]?.longMessage || "Failed to reset password" };
    }

    // Force-logout: kill any active sessions so the new temp password is the
    // only way back in. The user is bounced to login on their next request.
    await revokeAllSessionsForUser(user.clerkUserId);

    // Send email via Resend
    try {
      const appUrl = (
        process.env.APP_URL || "http://localhost:3000"
      ).replace(/\/$/, "");

      const html = renderEmail({
        preheader: "Your Scamurai password has been reset by an administrator.",
        bodyHtml: [
          emailHeading("Your password has been reset"),
          emailParagraph(`Hi ${user.fullName},`),
          emailParagraph(
            "An administrator has reset your Scamurai password. Use the temporary password below to sign in. You'll be prompted to choose a new password on your next login."
          ),
          emailCallout("Temporary password", tempPassword),
          emailButton(appUrl, "Sign in to Scamurai"),
          emailMutedNote(
            "If you didn't expect this change, contact your administrator immediately — your account may have been compromised."
          ),
        ].join("\n"),
      });

      await sendEmail({
        to: user.email,
        subject: "Your Scamurai password was reset",
        html,
      });
      console.log(`[resetBrandUserPassword] Reset email sent to ${user.email}`);
    } catch (emailErr) {
      console.error("[resetBrandUserPassword] Failed to send reset email:", emailErr);
    }

    return { success: true };
  } catch (error) {
    console.error("Error resetting brand user password:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
