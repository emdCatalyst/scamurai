'use client';

import { useTranslations, useLocale } from 'next-intl';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend 
} from 'recharts';
import { format } from 'date-fns';
import { arSA, enUS } from 'date-fns/locale';

interface OrdersOverTimeChartProps {
  data: {
    date: string;
    submitted: number;
    approved: number;
    rejected: number;
  }[];
}

export function OrdersOverTimeChart({ data }: OrdersOverTimeChartProps) {
  const t = useTranslations('brand.dashboard.charts');
  const locale = useLocale();
  const dateLocale = locale === 'ar' ? arSA : enUS;
  const isAr = locale === 'ar';

  const formatXAxis = (tickItem: string) => {
    return format(new Date(tickItem), 'MMM d', { locale: dateLocale });
  };

  return (
    <div className="bg-[var(--brand-surface)] rounded-[32px] p-8 shadow-sm border border-[var(--brand-border)] flex flex-col h-[400px]">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-[var(--brand-surface-fg)]">{t('overTime')}</h3>
          <p className="text-xs font-medium text-[var(--brand-surface-fg-muted)] mt-1">{t('last30Days')}</p>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--brand-border)" opacity={0.5} />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatXAxis}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--brand-surface-fg-muted)', fontSize: 10, fontWeight: 600 }}
              dy={10}
              reversed={isAr}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--brand-surface-fg-muted)', fontSize: 10, fontWeight: 600 }}
              orientation={isAr ? 'right' : 'left'}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--brand-surface)',
                borderRadius: '16px', 
                border: '1px solid var(--brand-border)', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                padding: '12px'
              }}
              labelStyle={{ color: 'var(--brand-surface-fg)', fontWeight: 700, marginBottom: '4px', fontSize: '12px' }}
              itemStyle={{ fontSize: '12px', padding: '2px 0' }}
              labelFormatter={(label) => format(new Date(label), 'PPP', { locale: dateLocale })}
            />
            <Legend 
              verticalAlign="top" 
              align="right" 
              iconType="circle"
              content={({ payload }) => (
                <div className="flex gap-4 justify-end mb-6">
                  {payload?.map((entry, index: number) => {
                    const value = typeof entry.value === "string" ? entry.value : "";
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-[10px] font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-wider">
                          {value ? t(value as Parameters<typeof t>[0]) : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            />
            <Line 
              name="submitted"
              type="monotone" 
              dataKey="submitted" 
              stroke="var(--brand-primary)" 
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
            <Line 
              name="approved"
              type="monotone" 
              dataKey="approved" 
              stroke="#5cbf8f" 
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
            <Line 
              name="rejected"
              type="monotone" 
              dataKey="rejected" 
              stroke="var(--brand-danger)" 
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
