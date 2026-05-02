import { requireAuth } from "@/lib/auth";
import { getBranches, getBrandBranchLimit, countAllBranches } from "@/lib/queries/branches";
import { getBrandBySlug } from "@/lib/queries/brands";
import { notFound } from "next/navigation";
import BranchesPageContent from "@/components/brand/branches/BranchesPageContent";

export default async function BranchesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; brandSlug: string }>;
  searchParams: Promise<{
    q?: string;
    status?: "active" | "inactive" | "all";
    page?: string;
    sort?: "newest" | "oldest" | "name_asc" | "name_desc" | "most_orders";
  }>;
}) {
  const { brandSlug, locale } = await params;
  const { q, status, page, sort } = await searchParams;

  // 1. Auth & Brand check
  const { brandId: authBrandId } = await requireAuth(["brand_admin"]);
  const brand = await getBrandBySlug(brandSlug);
  if (!brand || brand.id !== authBrandId) notFound();

  // 2. Fetch Data
  const currentPage = Number(page) || 1;
  const { rows, total, tabCounts } = await getBranches({
    brandId: brand.id,
    search: q,
    status: status || "all",
    sort: sort || "newest",
    page: currentPage,
    pageSize: 20,
  });

  const branchCount = await countAllBranches(brand.id);
  const limit = await getBrandBranchLimit(brand.id);

  return (
    <BranchesPageContent
      brandId={brand.id}
      initialData={rows}
      totalCount={total}
      tabCounts={tabCounts}
      branchCount={branchCount}
      limit={limit}
      currentPage={currentPage}
      locale={locale}
    />
  );
}
