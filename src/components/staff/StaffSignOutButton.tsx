"use client";

import { useClerk } from "@clerk/nextjs";
import { ReactNode } from "react";

interface StaffSignOutButtonProps {
  redirectUrl: string;
  className?: string;
  children: ReactNode;
  title?: string;
}

/**
 * Inline sign-out trigger that bypasses Clerk's `<SignOutButton>` wrapper.
 * The wrapper version uses `React.Children.only` and intermittently rejects
 * a single JSX child under React 19 server components, throwing
 * "multiple children" at runtime. Calling `signOut({ redirectUrl })`
 * directly avoids that whole class of issue.
 */
export default function StaffSignOutButton({
  redirectUrl,
  className,
  children,
  title,
}: StaffSignOutButtonProps) {
  const { signOut } = useClerk();
  return (
    <button
      type="button"
      title={title}
      className={className}
      onClick={async () => {
        // The service worker keeps a copy of the order screen for weak
        // connections; on a shared phone it must not outlive this worker.
        if ("caches" in window) {
          for (const key of await caches.keys()) if (key.startsWith("pages-")) await caches.delete(key);
        }
        void signOut({ redirectUrl });
      }}
    >
      {children}
    </button>
  );
}
