import { requireAuth } from "@/lib/auth";
import { getBrandUsers, countNonDeletedUsers, getBrandUserLimit } from "@/lib/queries/brandUsers";
import { getBrandBySlug } from "@/lib/queries/brands";
import { db } from "@/lib/db";
import { branches } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import BrandUsersPageContent from "@/components/brand/users/BrandUsersPageContent";

export default async function BrandUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; brandSlug: string }>;
  searchParams: Promise<{
    q?: string;
    role?: "finance" | "staff" | "all";
    status?: "active" | "inactive" | "all";
    branch?: string;
    page?: string;
    sort?: "newest" | "oldest" | "name_asc" | "name_desc";
  }>;
}) {
  const { brandSlug, locale } = await params;
  const { q, role, status, branch, page, sort } = await searchParams;

  // 1. Auth & Brand check
  const { brandId: authBrandId } = await requireAuth(["brand_admin"]);
  const brand = await getBrandBySlug(brandSlug);
  if (!brand || brand.id !== authBrandId) notFound();

  // 2. Fetch Data
  const currentPage = Number(page) || 1;
  const { rows, total, tabCounts } = await getBrandUsers({
    brandId: brand.id,
    search: q,
    role: role,
    status: status,
    branchId: branch,
    sort: sort,
    page: currentPage,
    pageSize: 20,
  });

  const userCount = await countNonDeletedUsers(brand.id);
  const limit = await getBrandUserLimit(brand.id);

  // 3. Fetch active branches for the filter/form dropdowns
  const activeBranches = await db.query.branches.findMany({
    where: and(
      eq(branches.brandId, brand.id),
      eq(branches.isActive, true),
      isNull(branches.deletedAt)
    ),
    columns: { id: true, name: true },
  });

  return (
      
      <BrandUsersPageContent
        initialData={rows}
        totalCount={total}
        tabCounts={tabCounts}
        userCount={userCount}
        limit={limit}
        currentPage={currentPage}
        locale={locale}
        branches={activeBranches}
      />
  );
}
