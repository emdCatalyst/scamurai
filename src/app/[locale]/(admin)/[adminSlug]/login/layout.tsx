import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

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
      redirect(`/${locale}/${adminSlug}/dashboard`);
    }
  }

  return <>{children}</>;
}
