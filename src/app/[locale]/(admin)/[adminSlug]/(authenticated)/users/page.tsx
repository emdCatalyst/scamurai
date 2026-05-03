import { getUsers } from "@/lib/queries/users";
import { UsersPageContent } from "@/components/admin/users/UsersPageContent";
import { Metadata } from "next";
import { Suspense } from 'react';
import { db } from "@/lib/db";
import { brands } from "@/lib/db/schema";
import { isNull, asc } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Users Management | Scamurai Admin",
};

type PageProps = {
  params: Promise<{ locale: string; adminSlug: string }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    role?: string;
    brand?: string;
    sort?: string;
    page?: string;
  }>;
};

export default async function UsersPage({ params, searchParams }: PageProps) {
  return (
    <Suspense fallback={<UsersLoading />}>
      <UsersDataWrapper params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function UsersDataWrapper({ params, searchParams }: PageProps) {
  const sp = await searchParams;
  
  const status = sp.status || "all";
  const role = sp.role || "all";
  const search = sp.q || "";
  const sort = sp.sort || "newest";
  const brandId = sp.brand || "all";
  const page = parseInt(sp.page || "1", 10);
  const pageSize = 20;

  // Sequential awaits — concurrent dispatch on max:1 + Supavisor transaction
  // pool surfaces as `error in input stream`. Same pattern as dashboard/page.tsx.
  const { rows: userRows, total, counts } = await getUsers({
    search,
    status: status as any,
    role: role as any,
    brandId: brandId === "all" ? undefined : brandId,
    sort: sort as any,
    page,
    pageSize,
  });

  const brandRows = await db
    .select({ id: brands.id, name: brands.name })
    .from(brands)
    .where(isNull(brands.deletedAt))
    .orderBy(asc(brands.name))
    .execute();

  return (
    <UsersPageContent
      users={userRows}
      total={total}
      counts={counts}
      status={status}
      role={role}
      search={search}
      sort={sort}
      page={page}
      pageSize={pageSize}
      brandId={brandId}
      brands={brandRows}
    />
  );
}

function UsersLoading() {
  return (
    <div className="space-y-6 animate-pulse p-4">
      <div className="h-16 w-full bg-slate-100 rounded-xl mb-6" />
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-12 w-full bg-slate-50 border-b border-slate-100" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 w-full border-b border-slate-50 last:border-0" />
        ))}
      </div>
    </div>
  );
}
