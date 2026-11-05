'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { isPlanTier } from '@/lib/services/catalog';
import ServiceChip from '@/components/admin/applications/ServiceChip';
import {
  APPLICATION_BUCKETS,
  type ApplicationBucket,
  type DashboardApplication,
  type DashboardBranch,
  type DashboardOrderDay,
} from './types';
import { localizedPath } from "@/i18n/paths";
import type { Locale } from "@/i18n/routing";

interface DashboardClientProps {
  applicationStats: Record<ApplicationBucket, number>;
  recentApplications: DashboardApplication[];
  topBranches: DashboardBranch[];
  orderTrends: DashboardOrderDay[];
}

/** Chart colour and badge style per application bucket. */
const BUCKET_STYLES: Record<ApplicationBucket, { color: string; badge: string }> = {
  pending: { color: '#f59e0b', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  interest: { color: '#94a3b8', badge: 'bg-slate-50 text-slate-600 border-slate-200' },
  quoted: { color: '#3b82f6', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  paid: { color: '#8b5cf6', badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  approved: { color: '#10b981', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  rejected: { color: '#ef4444', badge: 'bg-red-50 text-red-700 border-red-200' },
};

/** Stacked from the bottom: what's settled first, then what still needs review. */
const ORDER_SERIES = [
  { key: 'approved', color: '#10b981' },
  { key: 'needsReview', color: '#f59e0b' },
  { key: 'rejected', color: '#ef4444' },
] as const;

const CARD = 'bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden min-w-0';
const TOOLTIP_STYLE = {
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
  padding: '12px 16px',
};

export default function DashboardClient({
  applicationStats,
  recentApplications,
  topBranches,
  orderTrends,
}: DashboardClientProps) {
  const params = useParams<{ adminSlug: string; locale: string }>();
  const router = useRouter();
  const t = useTranslations('admin.dashboard');
  const tPlans = useTranslations('plans');
  const format = useFormatter();
  const isAr = params.locale === 'ar';
  const applicationsHref = localizedPath(params.locale as Locale, `/${params.adminSlug}/applications`);

  const pieData = APPLICATION_BUCKETS.map((bucket) => ({
    bucket,
    name: t(bucket),
    value: applicationStats[bucket] ?? 0,
    color: BUCKET_STYLES[bucket].color,
  }));
  const totalApps = pieData.reduce((sum, slice) => sum + slice.value, 0);

  const hasOrderTrends = orderTrends.some((day) => day.approved + day.rejected + day.needsReview > 0);
  const formatDay = (date: string) =>
    format.dateTime(new Date(`${date}T00:00:00Z`), { day: 'numeric', month: 'short', timeZone: 'UTC' });

  const maxBranchVolume = Math.max(1, ...topBranches.map((branch) => branch.orderCount));

  return (
    <div className="space-y-8 pb-10 min-w-0">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Applications overview */}
        <section className={`${CARD} p-8 group`} aria-labelledby="applications-overview">

          <h3 id="applications-overview" className="text-slate-800 font-bold text-lg mb-8 relative z-10">
            {t('applicationsOverview')}
          </h3>
          <div className="h-72 relative z-10 min-w-0">
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-black text-slate-800 tracking-tight">{totalApps}</span>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-widest mt-1">{t('totalApps')}</span>
            </div>
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={4}
                >
                  {pieData.map((slice) => (
                    <Cell key={slice.bucket} fill={slice.color} />
                  ))}
                </Pie>
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={{ color: '#2A2A28', fontWeight: 600, fontSize: '14px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3 mt-8 relative z-10">
            {pieData.map((slice) => (
              <li key={slice.bucket} className="flex items-center gap-2.5">
                <span aria-hidden="true" className="w-3.5 h-3.5 rounded-full shadow-sm shrink-0" style={{ backgroundColor: slice.color }} />
                <span className="text-sm font-semibold text-slate-600">
                  {slice.name} <span className="text-slate-500 tabular-nums">({slice.value})</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Orders per day */}
        <section className={`${CARD} p-8 group`} aria-labelledby="order-trends">

          <div className="flex justify-between items-center mb-8 relative z-10">
            <h3 id="order-trends" className="text-slate-800 font-bold text-lg">{t('orderTrends')}</h3>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{t('last30Days')}</span>
          </div>
          <div className="h-72 relative z-10 min-w-0" dir="ltr">
            {hasOrderTrends ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={orderTrends} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    reversed={isAr}
                    axisLine={false}
                    tickLine={false}
                    interval={6}
                    tickFormatter={formatDay}
                    tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
                    orientation={isAr ? 'right' : 'left'}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(148,163,184,0.12)' }}
                    labelFormatter={(label) => formatDay(String(label))}
                    contentStyle={{ ...TOOLTIP_STYLE, direction: isAr ? 'rtl' : 'ltr' }}
                    labelStyle={{ color: '#334155', fontWeight: 700, marginBottom: 4 }}
                    itemStyle={{ fontWeight: 600, fontSize: '13px' }}
                  />
                  {ORDER_SERIES.map((series, index) => (
                    <Bar
                      key={series.key}
                      dataKey={series.key}
                      name={t(series.key)}
                      stackId="orders"
                      fill={series.color}
                      radius={index === ORDER_SERIES.length - 1 ? [4, 4, 0, 0] : 0}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 font-medium">{t('noOrderData')}</div>
            )}
          </div>
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-3 mt-8 relative z-10">
            {ORDER_SERIES.map((series) => (
              <li key={series.key} className="flex items-center gap-2.5">
                <span aria-hidden="true" className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: series.color }} />
                <span className="text-sm font-semibold text-slate-600">{t(series.key)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent applications */}
        <section className={`${CARD} p-4 md:p-8 flex flex-col`} aria-labelledby="recent-applications">
          <div className="flex justify-between items-start md:items-center mb-8 relative z-10 flex-col md:flex-row gap-3">
            <div>
              <h3 id="recent-applications" className="text-slate-800 font-bold text-lg">{t('recentApplications')}</h3>
              <p className="text-sm text-slate-500 mt-1">{t('recentAppsSubtitle')}</p>
            </div>
            <Link
              href={applicationsHref}
              className="group/link flex items-center gap-1 text-navy text-sm font-semibold hover:text-navy transition-colors"
            >
              {t('viewAll')}
              <ChevronRight size={16} aria-hidden="true" className="transition-transform rtl:rotate-180 group-hover/link:translate-x-1 rtl:group-hover/link:-translate-x-1" />
            </Link>
          </div>

          <div className="overflow-x-auto relative z-10 -mx-4 md:mx-0 px-4 md:px-0">
            {recentApplications.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-medium">{t('noRecentApps')}</div>
            ) : (
              <table className="w-full border-collapse min-w-[640px] text-start">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                    <th scope="col" className="pb-4 px-2 md:px-0 text-start">{t('brand')}</th>
                    <th scope="col" className="pb-4 px-2 text-start">{t('service')}</th>
                    <th scope="col" className="pb-4 px-2 text-start">{t('plan')}</th>
                    <th scope="col" className="pb-4 px-2 text-start">{t('status')}</th>
                    <th scope="col" className="pb-4 px-2 md:px-0 text-end">{t('time')}</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {recentApplications.map((app) => {
                    const href = `${applicationsHref}?id=${app.id}`;
                    const badge = app.bucket ? BUCKET_STYLES[app.bucket].badge : BUCKET_STYLES.pending.badge;
                    return (
                      <tr
                        key={app.id}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors cursor-pointer group/row"
                        onClick={() => router.push(href)}
                      >
                        <td className="py-4 px-2 md:px-0">
                          <Link
                            href={href}
                            onClick={(event) => event.stopPropagation()}
                            className="font-bold text-slate-800 group-hover/row:text-navy transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
                          >
                            {app.brandName}
                          </Link>
                        </td>
                        <td className="py-4 px-2">{app.service ? <ServiceChip service={app.service} /> : '—'}</td>
                        <td className="py-4 px-2 font-medium text-slate-600">
                          {isPlanTier(app.plan) ? tPlans(app.plan) : <span className="text-slate-500">{t('interest')}</span>}
                        </td>
                        <td className="py-4 px-2">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${badge}`}>
                            {app.bucket ? t(app.bucket) : '—'}
                          </span>
                        </td>
                        <td className="py-4 px-2 md:px-0 text-slate-500 font-medium text-xs text-end">{app.submittedAt}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Top branches */}
        <section className={`${CARD} p-4 md:p-8 flex flex-col`} aria-labelledby="top-performers">
          <div className="mb-8 relative z-10">
            <h3 id="top-performers" className="text-slate-800 font-bold text-lg">{t('topPerformers')}</h3>
            <p className="text-sm text-slate-500 mt-1">{t('topPerformersSubtitle')}</p>
          </div>

          <div className="space-y-6 flex-1 flex flex-col justify-center relative z-10">
            {topBranches.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-medium">{t('noOrderData')}</div>
            ) : (
              topBranches.map((branch, idx) => {
                const width = `${(branch.orderCount / maxBranchVolume) * 100}%`;
                const colors = ['bg-[#FF5B3A]', 'bg-[#3b82f6]', 'bg-[#6366f1]', 'bg-[#8b5cf6]', 'bg-[#d946ef]'];
                const color = colors[idx % colors.length];

                return (
                  <div key={branch.id} className="group cursor-default">
                    <div className="flex justify-between items-end mb-2 text-sm">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0 ${color}`}>
                          {idx + 1}
                        </div>
                        <div className="truncate">
                          <span className="font-bold text-slate-800 group-hover:text-slate-900 transition-colors">{branch.branchName}</span>
                          <span className="text-slate-500 mx-2 font-medium text-xs px-2 py-0.5 bg-slate-100 rounded-full">{branch.brandName}</span>
                        </div>
                      </div>
                      <span className="font-bold text-slate-700 whitespace-nowrap shrink-0">
                        {branch.orderCount.toLocaleString()} <span className="text-slate-500 text-xs font-medium mx-1">{t('orders')}</span>
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mx-9" style={{ width: 'calc(100% - 36px)' }}>
                      <div className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${color}`} style={{ width }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
