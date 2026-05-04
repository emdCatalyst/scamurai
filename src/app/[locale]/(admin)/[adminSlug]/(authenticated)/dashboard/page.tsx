import { Building2, Clock, ShoppingBag, TrendingUp } from 'lucide-react';
import { Suspense } from 'react';
import DashboardClient from './DashboardClient';
import { db } from '@/lib/db';
import { applications, brands, orders, branches } from '@/lib/db/schema';
import { eq, count, desc, gte, sql } from 'drizzle-orm';
import { getTranslations, getFormatter } from 'next-intl/server';

export default async function AdminDashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardDataWrapper />
    </Suspense>
  );
}

async function DashboardDataWrapper() {
  const [t, format] = await Promise.all([
    getTranslations('admin.dashboard'),
    getFormatter()
  ]);
  
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayOfWeek = new Date(now);
  firstDayOfWeek.setDate(now.getDate() - now.getDay());
  const startOfToday = new Date(now);
  startOfToday.setHours(0,0,0,0);

  // Inclusive 30-day window ending today (29 days back + today = 30 days).
  const trendsStart = new Date(startOfToday);
  trendsStart.setDate(trendsStart.getDate() - 29);

  const [
    appStatsRaw,
    brandCountRow,
    monthOrders,
    todayOrders,
    weekOrders,
    recentApplicationsRaw,
    topBranchesRaw,
    orderTrendsRaw,
  ] = await Promise.all([
    db.select({
      status: applications.status,
      count: count(),
    }).from(applications).groupBy(applications.status).execute(),

    db.select({ count: count() })
      .from(brands)
      .where(eq(brands.isActive, true))
      .then(res => res[0]),

    db.select({ count: count() }).from(orders).where(gte(orders.submittedAt, firstDayOfMonth)).then(res => res[0]),
    db.select({ count: count() }).from(orders).where(gte(orders.submittedAt, startOfToday)).then(res => res[0]),
    db.select({ count: count() }).from(orders).where(gte(orders.submittedAt, firstDayOfWeek)).then(res => res[0]),

    db.select({
      id: applications.id,
      brandName: applications.brandName,
      plan: applications.plan,
      status: applications.status,
      submittedAt: applications.createdAt,
    })
      .from(applications)
      .orderBy(desc(applications.createdAt))
      .limit(5)
      .execute(),

    db.select({
      id: branches.id,
      branchName: branches.name,
      brandName: brands.name,
      orderCount: count(orders.id),
    })
      .from(branches)
      .innerJoin(brands, eq(branches.brandId, brands.id))
      .leftJoin(orders, eq(orders.branchId, branches.id))
      .where(gte(orders.submittedAt, firstDayOfMonth))
      .groupBy(branches.id, brands.name)
      .orderBy(desc(count(orders.id)))
      .limit(5)
      .execute(),

    db.select({
      day: sql<string>`to_char(date_trunc('day', ${orders.submittedAt}), 'YYYY-MM-DD')`.as('day'),
      submitted: sql<number>`COUNT(*)::int`.as('submitted'),
      approved: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'approved')::int`.as('approved'),
      rejected: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'rejected')::int`.as('rejected'),
    })
      .from(orders)
      .where(gte(orders.submittedAt, trendsStart))
      .groupBy(sql`date_trunc('day', ${orders.submittedAt})`)
      .execute(),
  ]);

  // Fill missing days so the line chart renders a continuous 30-day window
  // even on days with no orders.
  const trendsByDay = new Map(
    orderTrendsRaw.map((r) => [r.day, r])
  );
  const orderTrends = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(trendsStart);
    d.setDate(trendsStart.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const row = trendsByDay.get(key);
    return {
      date: key,
      submitted: row ? Number(row.submitted) : 0,
      approved: row ? Number(row.approved) : 0,
      rejected: row ? Number(row.rejected) : 0,
    };
  });
  
  const applicationStats = { pending: 0, quoted: 0, approved: 0, rejected: 0 };
  appStatsRaw.forEach(row => {
    if (row.status in applicationStats) {
      applicationStats[row.status as keyof typeof applicationStats] = Number(row.count);
    }
  });

  const brandCount = brandCountRow ? Number(brandCountRow.count) : 0;

  const orderStats = {
    thisMonth: monthOrders ? Number(monthOrders.count) : 0,
    today: todayOrders ? Number(todayOrders.count) : 0,
    week: weekOrders ? Number(weekOrders.count) : 0,
  };


  const recentApplications = recentApplicationsRaw.map(app => ({
    id: app.id,
    brandName: app.brandName,
    plan: app.plan,
    status: app.status,
    submittedAt: format.relativeTime(new Date(app.submittedAt), { now }),
  }));

  const topBranches = topBranchesRaw.map(b => ({
    id: b.id,
    branchName: b.branchName,
    brandName: b.brandName,
    orderCount: Number(b.orderCount),
  }));

  const totalApplications = Object.values(applicationStats).reduce((a, b) => a + b, 0);
  const approvalRate = totalApplications > 0 ? ((applicationStats.approved / totalApplications) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6">
      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title={t('activeBrands')} value={brandCount} icon={Building2} color="sky" />
        <StatCard title={t('pendingApplications')} value={applicationStats.pending} icon={Clock} color="amber" />
        <StatCard title={t('ordersThisMonth')} value={orderStats.thisMonth.toLocaleString()} icon={ShoppingBag} color="mint" />
        <StatCard title={t('approvalRate')} value={`${approvalRate}%`} icon={TrendingUp} color={parseFloat(approvalRate) >= 50 ? 'mint' : 'red'} />
      </div>

      <DashboardClient
        applicationStats={applicationStats}
        recentApplications={recentApplications}
        topBranches={topBranches}
        orderTrends={orderTrends}
      />
    </div>
  );
}

function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-white rounded-2xl border border-slate-100" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-[450px] bg-white rounded-2xl border border-slate-100" />
        <div className="h-[450px] bg-white rounded-2xl border border-slate-100" />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colorMap = {
    sky: 'text-[#4fc5df] bg-[#4fc5df]/10 border-[#4fc5df]/20',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    mint: 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20',
    red: 'text-red-500 bg-red-500/10 border-red-500/20',
  };

  const bgGradient = colorMap[color as keyof typeof colorMap].split(' ')[1];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl -mr-10 -mt-10 pointer-events-none transition-opacity opacity-40 group-hover:opacity-80 ${bgGradient}`} />
      
      <div className="flex justify-between items-start relative z-10">
        <div>
          <p className="text-slate-500 text-sm font-semibold mb-2">{title}</p>
          <h3 className="text-slate-800 text-3xl font-black tracking-tight">{value}</h3>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm ${colorMap[color as keyof typeof colorMap]}`}>
          <Icon size={24} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
