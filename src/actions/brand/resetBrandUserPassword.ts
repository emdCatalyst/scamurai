"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { clerkClient } from "@clerk/nextjs/server";
import { sendEmail } from "@/lib/email";

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

    // Send email via Resend
    try {
      await sendEmail({
        from: "Scamurai <onboarding@resend.dev>",
        to: user.email,
        subject: "Your Scamurai Password has been Reset",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h1 style="color: #172b49;">Password Reset</h1>
            <p>Hi ${user.fullName},</p>
            <p>Your password for Scamurai has been reset by an administrator.</p>
            
            <div style="background-color: #f2f2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #666;">New Temporary Password:</p>
              <p style="margin: 5px 0 0; font-size: 20px; font-weight: bold; color: #4fc5df; letter-spacing: 1px;">${tempPassword}</p>
            </div>

            <p style="font-size: 14px; color: #666;">You will be required to change this password when you next log in.</p>
            
            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" 
               style="display: inline-block; background-color: #4fc5df; color: white; padding: 12px 24px; text-decoration: none; border-radius: 30px; font-weight: bold; margin-top: 20px;">
              Log In to Your Dashboard
            </a>
            
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="font-size: 12px; color: #999;">If you didn't request this change, please contact your administrator immediately.</p>
          </div>
        `
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
