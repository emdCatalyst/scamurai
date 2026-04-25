import { notFound } from "next/navigation";

export default async function AdminRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; adminSlug: string }>;
}) {
  const { adminSlug } = await params;

  if (adminSlug !== process.env.ADMIN_SLUG) {
    notFound();
  }

  return <>{children}</>;
}
