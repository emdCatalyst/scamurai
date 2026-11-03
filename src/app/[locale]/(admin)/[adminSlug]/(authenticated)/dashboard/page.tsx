import { Building2, Clock, ShoppingBag, TrendingUp, type LucideIcon } from 'lucide-react';
import { Suspense } from 'react';
import { count, desc, eq, gte, sql } from 'drizzle-orm';
import { getFormatter, getTranslations } from 'next-intl/server';
import { isApplicationStatus } from '@/lib/applications/status';
import { requireMasterAdminPage } from '@/lib/auth';
import { db } from '@/lib/db';
import { applications, branches, brands, orders } from '@/lib/db/schema';
import { getService, isLiveService, isServiceKey } from '@/lib/services/catalog';
import DashboardClient from './DashboardClient';
import {
  APPLICATION_BUCKETS,
  type ApplicationBucket,
  type DashboardApplication,
  type DashboardOrderDay,
} from './types';

const TREND_DAYS = 30;

export default async function AdminDashboardPage({ params }: { params: Promise<{ adminSlug: string }> }) {
  await requireMasterAdminPage((await params).adminSlug);
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardDataWrapper />
    </Suspense>
  );
}

/** Pending requests for services that aren't live yet are interest registrations, not work to do. */
function bucketFor(service: string, status: string): ApplicationBucket | null {
  if (!isServiceKey(service) || !isApplicationStatus(status)) return null;
  return !isLiveService(getService(service)) && status === 'pending' ? 'interest' : status;
}

async function DashboardDataWrapper() {
  const [t, format] = await Promise.all([getTranslations('admin.dashboard'), getFormatter()]);

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  // Inclusive window ending today (29 days back + today = 30 days).
  const trendsStart = new Date(startOfToday);
  trendsStart.setDate(trendsStart.getDate() - (TREND_DAYS - 1));

  const [appStatsRaw, brandCountRow, monthOrders, recentApplicationsRaw, topBranchesRaw, orderTrendsRaw] =
    await Promise.all([
      // Per service and status, so interest registrations can be told apart in TS.
      db
        .select({ service: applications.service, status: applications.status, count: count() })
        .from(applications)
        .groupBy(applications.service, applications.status),

      db
        .select({ count: count() })
        .from(brands)
        .where(eq(brands.isActive, true))
        .then((res) => res[0]),

      db
        .select({ count: count() })
        .from(orders)
        .where(gte(orders.submittedAt, firstDayOfMonth))
        .then((res) => res[0]),

      db
        .select({
          id: applications.id,
          brandName: applications.brandName,
          service: applications.service,
          plan: applications.plan,
          status: applications.status,
          submittedAt: applications.createdAt,
        })
        .from(applications)
        .orderBy(desc(applications.createdAt))
        .limit(5),

      db
        .select({
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
        .limit(5),

      db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${orders.submittedAt}), 'YYYY-MM-DD')`.as('day'),
          approved: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'approved')::int`.as('approved'),
          rejected: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'rejected')::int`.as('rejected'),
          needsReview: sql<number>`COUNT(*) FILTER (WHERE ${orders.status} = 'needs_review')::int`.as('needs_review'),
        })
        .from(orders)
        .where(gte(orders.submittedAt, trendsStart))
        .groupBy(sql`date_trunc('day', ${orders.submittedAt})`),
    ]);

  // Fill missing days so the chart always shows a continuous window.
  const trendsByDay = new Map(orderTrendsRaw.map((row) => [row.day, row]));
  const orderTrends: DashboardOrderDay[] = Array.from({ length: TREND_DAYS }, (_, i) => {
    const day = new Date(trendsStart);
    day.setDate(trendsStart.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    const row = trendsByDay.get(key);
    return {
      date: key,
      approved: row ? Number(row.approved) : 0,
      rejected: row ? Number(row.rejected) : 0,
      needsReview: row ? Number(row.needsReview) : 0,
    };
  });

  const applicationStats = Object.fromEntries(APPLICATION_BUCKETS.map((bucket) => [bucket, 0])) as Record<
    ApplicationBucket,
    number
  >;
  for (const row of appStatsRaw) {
    const bucket = bucketFor(row.service, row.status);
    if (bucket) applicationStats[bucket] += Number(row.count);
  }

  // Approval rate among decided applications (approved or rejected). Interest
  // registrations are never decided, so they can't drag the rate down.
  const decided = applicationStats.approved + applicationStats.rejected;
  const approvalRate = decided > 0 ? (applicationStats.approved / decided) * 100 : null;

  const recentApplications: DashboardApplication[] = recentApplicationsRaw.map((app) => ({
    id: app.id,
    brandName: app.brandName,
    service: isServiceKey(app.service) ? app.service : null,
    plan: app.plan,
    bucket: bucketFor(app.service, app.status),
    submittedAt: format.relativeTime(new Date(app.submittedAt), { now }),
  }));

  const topBranches = topBranchesRaw.map((branch) => ({
    id: branch.id,
    branchName: branch.branchName,
    brandName: branch.brandName,
    orderCount: Number(branch.orderCount),
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title={t('activeBrands')} value={brandCountRow ? Number(brandCountRow.count) : 0} icon={Building2} color="sky" />
        <StatCard
          title={t('pendingApplications')}
          value={applicationStats.pending}
          icon={Clock}
          color="amber"
          hint={applicationStats.interest > 0 ? t('interestHint', { count: applicationStats.interest }) : undefined}
        />
        <StatCard
          title={t('ordersThisMonth')}
          value={(monthOrders ? Number(monthOrders.count) : 0).toLocaleString()}
          icon={ShoppingBag}
          color="mint"
        />
        <StatCard
          title={t('approvalRate')}
          value={approvalRate === null ? '—' : `${approvalRate.toFixed(1)}%`}
          icon={TrendingUp}
          color={approvalRate === null ? 'sky' : approvalRate >= 50 ? 'mint' : 'red'}
          hint={t('approvalRateHint')}
        />
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
        {[1, 2, 3, 4].map((i) => (
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

const STAT_COLORS = {
  sky: { tile: 'text-[#4fc5df] bg-[#4fc5df]/10 border-[#4fc5df]/20', glow: 'bg-[#4fc5df]/10' },
  amber: { tile: 'text-amber-500 bg-amber-500/10 border-amber-500/20', glow: 'bg-amber-500/10' },
  mint: { tile: 'text-[#10b981] bg-[#10b981]/10 border-[#10b981]/20', glow: 'bg-[#10b981]/10' },
  red: { tile: 'text-red-500 bg-red-500/10 border-red-500/20', glow: 'bg-red-500/10' },
} as const;

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  hint,
}: {
  title: string;
  value: React.ReactNode;
  icon: LucideIcon;
  color: keyof typeof STAT_COLORS;
  /** Small line under the value (context such as "+2 interest registrations"). */
  hint?: string;
}) {
  const styles = STAT_COLORS[color];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl -mr-10 -mt-10 pointer-events-none transition-opacity opacity-40 group-hover:opacity-80 ${styles.glow}`} />

      <div className="flex justify-between items-start relative z-10">
        <div>
          <p className="text-slate-500 text-sm font-semibold mb-2">{title}</p>
          <p className="text-slate-800 text-3xl font-black tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs font-medium text-slate-500">{hint}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-sm ${styles.tile}`}>
          <Icon size={24} strokeWidth={2} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
