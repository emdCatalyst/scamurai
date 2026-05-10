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
      onClick={() => {
        void signOut({ redirectUrl });
      }}
    >
      {children}
    </button>
  );
}
