import { getBrands } from "@/lib/queries/brands";
import { BrandsPageContent } from "@/components/admin/brands/BrandsPageContent";
import { Metadata } from "next";
import { Suspense } from 'react';
import BrandsLoading from './loading';

export const metadata: Metadata = {
  title: "Brands Management | Scamurai Admin",
};

type PageProps = {
  params: Promise<{ locale: string; adminSlug: string }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    plan?: string;
    sort?: string;
    page?: string;
  }>;
};

export default async function BrandsPage({ params, searchParams }: PageProps) {
  return (
    <Suspense fallback={<BrandsLoading />}>
      <BrandsDataWrapper params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function BrandsDataWrapper({ params, searchParams }: PageProps) {
  const sp = await searchParams;
  
  const status = sp.status || "all";
  const plan = sp.plan || "all";
  const search = sp.q || "";
  const sort = sp.sort || "newest";
  const page = parseInt(sp.page || "1", 10);
  const pageSize = 20;

  const { rows, total, counts } = await getBrands({
    search,
    status: status as any,
    plan: plan as any,
    sort: sort as any,
    page,
    pageSize,
  });

  return (
    <BrandsPageContent
      brands={rows}
      total={total}
      counts={counts}
      status={status}
      plan={plan}
      search={search}
      sort={sort}
      page={page}
      pageSize={pageSize}
    />
  );
}
