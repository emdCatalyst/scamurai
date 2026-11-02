import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AppProviders from "@/components/providers/AppProviders";
import { NO_INDEX } from "@/lib/seo/site";

export const metadata: Metadata = { robots: NO_INDEX };

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

  return <AppProviders>{children}</AppProviders>;
}
