import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { localizedPath } from "@/i18n/paths";
import type { Locale } from "@/i18n/routing";

export default async function LoginLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; adminSlug: string }>;
}) {
  const { userId } = await auth();
  const { locale, adminSlug } = await params;

  if (userId) {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    if (user.publicMetadata?.role === "master_admin") {
      redirect(localizedPath(locale as Locale, `/${adminSlug}/dashboard`));
    }
  }

  return <>{children}</>;
}
