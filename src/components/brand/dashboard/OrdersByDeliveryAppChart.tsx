'use client';

import { useTranslations } from 'next-intl';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';

interface OrdersByDeliveryAppChartProps {
  data: {
    name: string;
    value: number;
  }[];
}

const COLORS = [
  'var(--brand-primary)',
  '#5cbf8f',
  'var(--brand-background)',
  '#f59e0b',
  'var(--brand-text-accent)',
  '#ec4899',
];

export function OrdersByDeliveryAppChart({ data }: OrdersByDeliveryAppChartProps) {
  const t = useTranslations('brand.dashboard.charts');

  return (
    <div className="bg-[var(--brand-surface)] rounded-[32px] p-8 shadow-sm border border-[var(--brand-border)] flex flex-col h-[400px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-[var(--brand-surface-fg)]">{t('byApp')}</h3>
          <p className="text-xs font-medium text-[var(--brand-surface-fg-muted)] mt-1">{t('last30Days')}</p>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--brand-surface)',
                borderRadius: '16px', 
                border: '1px solid var(--brand-border)', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                padding: '12px'
              }}
              itemStyle={{ color: 'var(--brand-surface-fg)', fontSize: '12px', fontWeight: 600 }}
            />
            <Legend 
              verticalAlign="middle" 
              align="right" 
              layout="vertical"
              iconType="circle"
              formatter={(value, entry: { payload?: { value?: number } }) => (
                <span className="text-xs font-bold text-[var(--brand-surface-fg-muted)]">
                  {value} ({entry.payload?.value || 0})
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
