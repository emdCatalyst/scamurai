"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { signOutOfPhone, type LeftOnPhone, type WorkerLeaving } from "@/lib/staff/signOut";
import { leavePhone, uploadBeforeSignOut } from "./useOutbox";

interface StaffSignOutButtonProps {
  redirectUrl: string;
  className?: string;
  children: ReactNode;
  title?: string;
}

/**
 * Sign-out for staff on shared branch phones (src/lib/staff/signOut.ts):
 * the worker's waiting orders get a last chance to upload, and if some are
 * left the worker is asked first; their drafts and the saved order screen
 * are then deleted. A failed sign-out is shown, not swallowed.
 *
 * Calls `signOut({ redirectUrl })` directly instead of Clerk's
 * `<SignOutButton>`, whose `React.Children.only` intermittently rejects a
 * single JSX child under React 19 server components.
 */
export default function StaffSignOutButton({ redirectUrl, className, children, title }: StaffSignOutButtonProps) {
  const { signOut } = useClerk();
  // Whoever is signed in now: theirs are the orders this session can still send.
  const { userId } = useAuth();
  const t = useTranslations("brand.submit");
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const confirmLeaving = ({ unsent, unsaved }: LeftOnPhone) =>
    window.confirm(unsaved > 0 ? t("signOutUnsaved", { count: unsaved }) : t("signOutUnsent", { count: unsent }));

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    const worker: WorkerLeaving | undefined = userId
      ? { uploadFirst: () => uploadBeforeSignOut(userId), confirmLeaving, cleanUp: () => leavePhone(userId) }
      : undefined;
    try {
      // Once signed out, Clerk's redirect takes this screen away.
      if (!(await signOutOfPhone(() => signOut({ redirectUrl }), worker))) setBusy(false);
    } catch {
      setBusy(false);
      toast(t("signOutError"), "error");
    }
  };

  return (
    // `title` also names an icon-only button for screen readers.
    <button type="button" title={title} aria-label={title} className={className} onClick={onClick} disabled={busy} aria-busy={busy}>
      {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : children}
    </button>
  );
}
