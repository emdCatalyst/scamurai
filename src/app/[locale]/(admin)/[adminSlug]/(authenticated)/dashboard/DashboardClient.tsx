'use client';

import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function DashboardClient({
  applicationStats,
  recentApplications,
  topBranches,
  orderTrends,
}: any) {
  const params = useParams();
  const adminSlug = params.adminSlug as string;
  const locale = params.locale as string;
  const t = useTranslations('admin.dashboard');
  const isAr = locale === 'ar';

  const pieData = [
    { name: t('pending'), value: applicationStats.pending || 0, color: '#f59e0b' },
    { name: t('quoted'), value: applicationStats.quoted || 0, color: '#3b82f6' },
    { name: t('approved'), value: applicationStats.approved || 0, color: '#10b981' },
    { name: t('rejected'), value: applicationStats.rejected || 0, color: '#ef4444' },
  ];

  const lineData = orderTrends ?? [];
  const hasOrderTrends = lineData.some(
    (d: { submitted: number }) => d.submitted > 0
  );

  const maxBranchVolume = Math.max(...(topBranches.length ? topBranches.map((b: any) => b.orderCount) : [1]));
  const totalApps = pieData.reduce((a, b) => a + b.value, 0);

  return (
    <div className="space-y-8 pb-10 min-w-0">
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group min-w-0">
          <div className={`absolute top-0 ${isAr ? 'left-0' : 'right-0'} w-64 h-64 bg-[#4fc5df]/5 rounded-full blur-3xl ${isAr ? '-ml-20' : '-mr-20'} -mt-20 pointer-events-none transition-opacity group-hover:opacity-100 opacity-50`} />
          
          <h3 className="text-slate-800 font-bold text-lg mb-8 relative z-10">{t('applicationsOverview')}</h3>
          <div className="h-72 relative z-10 min-w-0">
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-black text-slate-800 tracking-tight">
                {totalApps}
              </span>
              <span className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-1">{t('totalApps')}</span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
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
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', padding: '12px 16px' }}
                  itemStyle={{ color: '#1e293b', fontWeight: 600, fontSize: '14px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-8 relative z-10">
            {pieData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full shadow-sm shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-sm font-semibold text-slate-600">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group min-w-0">
          <div className={`absolute top-0 ${isAr ? 'left-0' : 'right-0'} w-64 h-64 bg-blue-500/5 rounded-full blur-3xl ${isAr ? '-ml-20' : '-mr-20'} -mt-20 pointer-events-none transition-opacity group-hover:opacity-100 opacity-50`} />
          
          <div className="flex justify-between items-center mb-8 relative z-10">
            <h3 className="text-slate-800 font-bold text-lg">{t('orderTrends')}</h3>
            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{t('last30Days')}</span>
          </div>
          <div className="h-72 relative z-10 min-w-0" dir="ltr">
            {hasOrderTrends ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSubmitted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" hide />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8', fontWeight: 500 }} dy={-4} orientation={isAr ? 'right' : 'left'} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', padding: '12px 16px', direction: isAr ? 'rtl' : 'ltr' }}
                    labelStyle={{ display: 'none' }}
                    itemStyle={{ fontWeight: 600, fontSize: '13px' }}
                  />
                  <Line type="monotone" name={t('submitted')} dataKey="submitted" stroke="#0f172a" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: '#0f172a' }} />
                  <Line type="monotone" name={t('approved')} dataKey="approved" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
                  <Line type="monotone" name={t('rejected')} dataKey="rejected" stroke="#ef4444" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0, fill: '#ef4444' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 font-medium">
                {t('noOrderData')}
              </div>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 mt-8 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-[#0f172a] shrink-0" />
              <span className="text-sm font-semibold text-slate-600">{t('submitted')}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-[#10b981] shrink-0" />
              <span className="text-sm font-semibold text-slate-600">{t('approved')}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-3 h-3 rounded-full bg-[#ef4444] shrink-0" />
              <span className="text-sm font-semibold text-slate-600">{t('rejected')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Applications */}
        <div className="bg-white p-4 md:p-8 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col relative overflow-hidden group min-w-0">
          <div className="flex justify-between items-start md:items-center mb-8 relative z-10 flex-col md:flex-row gap-3">
            <div>
              <h3 className="text-slate-800 font-bold text-lg">{t('recentApplications')}</h3>
              <p className="text-sm text-slate-400 mt-1">{t('recentAppsSubtitle')}</p>
            </div>
            <Link 
              href={`/${locale}/${adminSlug}/applications`} 
              className="group/link flex items-center gap-1 text-[#4fc5df] text-sm font-semibold hover:text-[#3ab3ce] transition-colors"
            >
              {t('viewAll')}
              <ChevronRight size={16} className={`group-hover/link:${isAr ? '-translate-x-1 rotate-180' : 'translate-x-1'} transition-transform ${isAr ? 'rotate-180' : ''}`} />
            </Link>
          </div>
          
          <div className="overflow-x-auto relative z-10 -mx-4 md:mx-0 px-4 md:px-0">
            {recentApplications.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-medium">{t('noRecentApps')}</div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className={`border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider ${isAr ? 'text-right' : 'text-left'}`}>
                    <th className="pb-4 px-2 md:px-0">{t('brand')}</th>
                    <th className="pb-4 px-2 md:px-0">{t('plan')}</th>
                    <th className="pb-4 px-2 md:px-0">{t('status')}</th>
                    <th className={`pb-4 px-2 md:px-0 ${isAr ? 'text-left' : 'text-right'}`}>{t('time')}</th>
                  </tr>
                </thead>
                <tbody className={`text-sm ${isAr ? 'text-right' : 'text-left'}`}>
                  {recentApplications.map((app: any) => {
                    const statusConfig: any = {
                      pending: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
                      quoted: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
                      approved: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
                      rejected: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
                    };
                    const sc = statusConfig[app.status] || statusConfig.pending;

                    return (
                      <tr 
                        key={app.id} 
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors cursor-pointer group/row"
                        onClick={() => window.location.href = `/${locale}/${adminSlug}/applications?id=${app.id}`}
                      >
                        <td className="py-4 px-2 md:px-0">
                          <span className="font-bold text-slate-800 group-hover/row:text-[#4fc5df] transition-colors">{app.brandName}</span>
                        </td>
                        <td className="py-4 px-2 md:px-0 font-medium text-slate-500 capitalize">{app.plan}</td>
                        <td className="py-4 px-2 md:px-0">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${sc.bg} ${sc.text} ${sc.border}`}>
                            {t(app.status)}
                          </span>
                        </td>
                        <td className={`py-4 px-2 md:px-0 text-slate-400 font-medium text-xs ${isAr ? 'text-left' : 'text-right'}`}>{app.submittedAt}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Top Branches */}
        <div className="bg-white p-4 md:p-8 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col relative overflow-hidden min-w-0">
          <div className="mb-8 relative z-10">
            <h3 className="text-slate-800 font-bold text-lg">{t('topPerformers')}</h3>
            <p className="text-sm text-slate-400 mt-1">{t('topPerformersSubtitle')}</p>
          </div>
          
          <div className="space-y-6 flex-1 flex flex-col justify-center relative z-10">
            {topBranches.length === 0 ? (
               <div className="text-center py-12 text-slate-400 font-medium">{t('noOrderData')}</div>
            ) : (
              topBranches.map((branch: any, idx: number) => {
                const width = `${(branch.orderCount / maxBranchVolume) * 100}%`;
                const colors = ['bg-[#4fc5df]', 'bg-[#3b82f6]', 'bg-[#6366f1]', 'bg-[#8b5cf6]', 'bg-[#d946ef]'];
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
                          <span className="text-slate-400 mx-2 font-medium text-xs px-2 py-0.5 bg-slate-100 rounded-full">{branch.brandName}</span>
                        </div>
                      </div>
                      <span className="font-bold text-slate-700 whitespace-nowrap shrink-0">{branch.orderCount.toLocaleString()} <span className="text-slate-400 text-xs font-medium mx-1">{t('orders')}</span></span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mx-9" style={{ width: 'calc(100% - 36px)' }}>
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${color}`}
                        style={{ width }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
