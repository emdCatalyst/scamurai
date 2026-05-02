import { requireAuth } from "@/lib/auth";
import { getBrandBySlug } from "@/lib/queries/brands";
import { 
  getOrderStats, 
  getBranchStats, 
  getOrdersOverTime, 
  getOrdersByBranch, 
  getOrdersByDeliveryApp, 
  getTeamStats 
} from "@/lib/queries/dashboard";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { StatCards } from "@/components/brand/dashboard/StatCards";
import { OrdersOverTimeChart } from "@/components/brand/dashboard/OrdersOverTimeChart";
import { OrdersByDeliveryAppChart } from "@/components/brand/dashboard/OrdersByDeliveryAppChart";
import { OrdersByBranchList } from "@/components/brand/dashboard/OrdersByBranchList";
import { TeamOverviewPanel } from "@/components/brand/dashboard/TeamOverviewPanel";

export default async function BrandDashboardPage({
  params,
}: {
  params: Promise<{ brandSlug: string }>;
}) {
  const { brandSlug } = await params;
  const { brandId: userBrandId } = await requireAuth(["brand_admin"]);
  const brand = await getBrandBySlug(brandSlug);
  const t = await getTranslations("brand.dashboard");

  if (!brand) {
    notFound();
  }

  // Security check: ensure user belongs to this brand
  if (userBrandId !== brand.id) {
    redirect("/");
  }

  // Fetch all dashboard data sequentially to avoid connection pool exhaustion
  const orderStats = await getOrderStats(brand.id);
  const branchStats = await getBranchStats(brand.id);
  const ordersOverTime = await getOrdersOverTime(brand.id, 30);
  const ordersByBranch = await getOrdersByBranch(brand.id);
  const ordersByDeliveryApp = await getOrdersByDeliveryApp(brand.id);
  const teamStats = await getTeamStats(brand.id);

  return (
    <div className="p-8 max-w-[1440px] mx-auto space-y-10 animate-in fade-in duration-700">

      {/* Top Row: Stat Cards */}
      <StatCards orderStats={orderStats} branchStats={branchStats} />

      {/* Middle Row: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <OrdersOverTimeChart data={ordersOverTime} />
        <OrdersByDeliveryAppChart data={ordersByDeliveryApp} />
      </div>

      {/* Bottom Row: Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <OrdersByBranchList data={ordersByBranch} brandSlug={brandSlug} />
        <TeamOverviewPanel data={teamStats} brandSlug={brandSlug} />
      </div>
    </div>
  );
}
