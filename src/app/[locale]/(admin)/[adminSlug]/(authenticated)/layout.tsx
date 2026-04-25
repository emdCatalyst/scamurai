import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import AdminShell from "./AdminShell";

export default async function AuthenticatedAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; adminSlug: string }>;
}) {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    notFound();
  }

  // 1. Check role from session claims (O(1) compared to direct API call)
  let role = sessionClaims?.metadata?.role;
  let email = sessionClaims?.email;
  let image = sessionClaims?.image;
  
  // Fallback to direct API if session claims are missing metadata
  if (!role) {
    const user = await currentUser();
    if (!user) notFound();
    
    role = user.publicMetadata?.role as any;
    email = email || user.emailAddresses[0]?.emailAddress;
    image = image || user.imageUrl;
  }

  if (role !== "master_admin") {
    notFound();
  }

  const { locale, adminSlug } = await params;
  
  return (
    <AdminShell 
      locale={locale} 
      adminSlug={adminSlug} 
      adminEmail={email || "admin@scamurai.com"} 
      adminAvatar={image || ""}
    >
      {children}
    </AdminShell>
  );
}
