"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { requireAuth, revokeAllSessionsForUser, setBanForClerkUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import {
  renderEmail,
  emailHeading,
  emailParagraph,
  emailButton,
} from "@/lib/email-templates";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { clerkClient } from "@clerk/nextjs/server";

export async function setUserStatus({
  userId,
  isActive,
}: {
  userId: string;
  isActive: boolean;
}) {
  try {
    // 1. requireAuth(['master_admin'])
    await requireAuth(["master_admin"]);

    // 2. Fetch user by id
    const user = await db.query.users.findFirst({
      where: and(eq(users.id, userId), isNull(users.deletedAt)),
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // 3. Prevent deactivating master_admin
    if (user.role === "master_admin") {
      return { success: false, error: "Cannot modify master admin status" };
    }

    // 4. If isActive already matches target — return early
    if (user.isActive === isActive) {
      return { success: true };
    }

    // 5. UPDATE users SET is_active = targetState, updated_at = now()
    await db
      .update(users)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // 6. Clerk session management
    if (user.clerkUserId) {
      const client = await clerkClient();
      await client.users.updateUserMetadata(user.clerkUserId, {
        publicMetadata: {
          userIsActive: isActive,
        },
      });

      // On deactivation, kill active sessions so the user is bounced to
      // login immediately (not just on JWT refresh ~60s later).
      if (!isActive) {
        await revokeAllSessionsForUser(user.clerkUserId);
      }

      // Ban / unban at the Clerk level so the user can't log in fresh
      // during the suspension window. Without this, signIn.create() would
      // succeed and middleware would only redirect post-session-issuance.
      await setBanForClerkUser(user.clerkUserId, !isActive);
    }

    // 7. Send notification email via Resend
    try {
      const t = await getTranslations("admin.users.email");

      const subject = isActive
        ? t("activationSubject")
        : t("deactivationSubject");

      const body = isActive
        ? t("activationBody", { name: user.fullName })
        : t("deactivationBody", { name: user.fullName });

      const appUrl = (
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      ).replace(/\/$/, "");
      const ctaHref = isActive ? appUrl : "mailto:support@scamurai.com";
      const ctaLabel = isActive ? "Sign in to Scamurai" : "Contact support";

      const html = renderEmail({
        preheader: subject,
        bodyHtml: [
          emailHeading(subject),
          emailParagraph(body),
          emailButton(ctaHref, ctaLabel),
        ].join("\n"),
      });

      await sendEmail({
        to: user.email,
        subject,
        html,
      });
    } catch (emailError) {
      console.error("Failed to send user status update email:", emailError);
    }

    revalidatePath("/[adminSlug]/users", "page");
    return { success: true };
  } catch (error) {
    console.error("Error setting user status:", error);
    return { success: false, error: "Failed to update user status" };
  }
}

import { isNull } from "drizzle-orm";
