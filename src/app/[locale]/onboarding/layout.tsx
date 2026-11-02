import type { Metadata } from "next";
import AppProviders from "@/components/providers/AppProviders";
import { NO_INDEX } from "@/lib/seo/site";

export const metadata: Metadata = { robots: NO_INDEX };

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
