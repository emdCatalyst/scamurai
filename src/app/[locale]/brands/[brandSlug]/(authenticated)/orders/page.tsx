import { requireAuth } from "@/lib/auth";
import { getBrandBySlug } from "@/lib/queries/brands";
import {
  getOrders,
  getOrdersSummary,
  getActiveBranchOptions,
  getEnabledDeliveryAppOptions,
  type GetOrdersParams,
  type OrderSort,
} from "@/lib/queries/orders";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import OrdersFilterBar from "@/components/brand/orders/OrdersFilterBar";
import OrdersTable from "@/components/brand/orders/OrdersTable";
import OrdersPagination from "@/components/brand/orders/OrdersPagination";
import OrderSummaryBar from "@/components/brand/orders/OrderSummaryBar";
import OrderDetailDrawer from "@/components/brand/orders/OrderDetailDrawer";

const PAGE_SIZE = 30;

const VALID_SORTS: OrderSort[] = [
  "newest",
  "oldest",
  "amount_high",
  "amount_low",
];

function parseDate(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
}

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; brandSlug: string }>;
  searchParams: Promise<{
    q?: string;
    branch?: string;
    app?: string;
    date_from?: string;
    date_to?: string;
    page?: string;
    sort?: string;
    orderId?: string;
  }>;
}) {
  const { brandSlug, locale } = await params;
  const sp = await searchParams;

  // Auth: only finance + brand_admin (the layout allows staff too).
  const { brandId: authBrandId } = await requireAuth(["finance", "brand_admin"]);
  const brand = await getBrandBySlug(brandSlug);
  if (!brand || brand.id !== authBrandId) notFound();

  const t = await getTranslations("brand.orders");

  const sort: OrderSort = VALID_SORTS.includes(sp.sort as OrderSort)
    ? (sp.sort as OrderSort)
    : "newest";

  const currentPage = Math.max(Number(sp.page) || 1, 1);

  const queryParams: GetOrdersParams = {
    brandId: brand.id,
    search: sp.q || undefined,
    branchId: sp.branch || undefined,
    deliveryAppId: sp.app || undefined,
    dateFrom: parseDate(sp.date_from),
    dateTo: parseDate(sp.date_to, true),
    sort,
    page: currentPage,
    pageSize: PAGE_SIZE,
  };

  const [{ rows, total }, summary, branchOptions, appOptions] = await Promise.all([
    getOrders(queryParams),
    getOrdersSummary(queryParams),
    getActiveBranchOptions(brand.id),
    getEnabledDeliveryAppOptions(brand.id),
  ]);

  const hasActiveFilter = Boolean(
    sp.q || sp.branch || sp.app || sp.date_from || sp.date_to
  );

  return (
    <div className="space-y-6">

      <OrdersFilterBar
        branchOptions={branchOptions}
        appOptions={appOptions}
        currentSearch={sp.q || ""}
        currentBranch={sp.branch || ""}
        currentApp={sp.app || ""}
        currentDateFrom={sp.date_from || ""}
        currentDateTo={sp.date_to || ""}
        currentSort={sort}
      />


      <OrdersTable orders={rows} hasActiveFilter={hasActiveFilter} />

      <OrdersPagination
        total={total}
        pageSize={PAGE_SIZE}
        currentPage={currentPage}
        locale={locale}
      />

      <OrderDetailDrawer />
    </div>
  );
}
