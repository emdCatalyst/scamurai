import { getCatalogApps } from "@/lib/queries/deliveryAppCatalog";
import { DeliveryAppsPageContent } from "@/components/admin/delivery-apps/DeliveryAppsPageContent";
import { Metadata } from "next";
import { Suspense } from 'react';
import Loading from './loading';

export const metadata: Metadata = {
  title: "Delivery Applications | Scamurai Admin",
};

type PageProps = {
  params: Promise<{ locale: string; adminSlug: string }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    sort?: string;
    page?: string;
  }>;
};

export default async function DeliveryAppsPage({ params, searchParams }: PageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <DeliveryAppsDataWrapper params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function DeliveryAppsDataWrapper({ params, searchParams }: PageProps) {
  const sp = await searchParams;
  
  const status = sp.status || "all";
  const search = sp.q || "";
  const sort = sp.sort || "name_asc";
  const page = parseInt(sp.page || "1", 10);
  const pageSize = 20;

  const { rows, total, counts } = await getCatalogApps({
    search,
    status: status as any,
    sort: sort as any,
    page,
    pageSize,
  });

  return (
    <DeliveryAppsPageContent
      apps={rows}
      total={total}
      counts={counts}
      status={status}
      search={search}
      sort={sort}
      page={page}
      pageSize={pageSize}
    />
  );
}
