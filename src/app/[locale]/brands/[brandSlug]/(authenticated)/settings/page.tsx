import { requireAuth } from "@/lib/auth";
import { getBrandBySlug } from "@/lib/queries/brands";
import { getUserByClerkId } from "@/lib/queries/users";
import { countAllBranches, getBrandBranchLimit } from "@/lib/queries/branches";
import { countNonDeletedUsers, getBrandUserLimit } from "@/lib/queries/brandUsers";
import { notFound } from "next/navigation";
import SettingsPageContent from "@/components/brand/settings/SettingsPageContent";

export default async function BrandSettingsPage({
  params,
}: {
  params: Promise<{ locale: string; brandSlug: string }>;
}) {
  const { brandSlug } = await params;

  // 1. Auth & Data Fetching
  const { userId, brandId: authBrandId } = await requireAuth(["brand_admin"]);
  
  // Sequential awaits — concurrent dispatch on max:1 + Supavisor transaction
  // pool surfaces as `error in input stream` and intermittent skeleton hangs.
  const brand = await getBrandBySlug(brandSlug);
  const user = await getUserByClerkId(userId);
  const branchCount = await countAllBranches(authBrandId!);
  const branchLimit = await getBrandBranchLimit(authBrandId!);
  const userCount = await countNonDeletedUsers(authBrandId!);
  const userLimit = await getBrandUserLimit(authBrandId!);

  if (!brand || brand.id !== authBrandId || !user) {
    notFound();
  }

  return (
    <div className="p-8 animate-in fade-in duration-700">
      <SettingsPageContent
        brandId={brand.id}
        brand={{
          name: brand.name,
          slug: brand.slug,
          logoUrl: brand.logoUrl,
          brandColors: brand.brandColors,
          plan: brand.plan,
        }}
        user={{
          fullName: user.fullName,
          email: user.email,
        }}
        limits={{
          branchCount,
          branchLimit,
          userCount,
          userLimit,
        }}
      />
    </div>
  );
}
