'use client';

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { Building2, ChevronRight } from 'lucide-react';

interface BrandsUsingAppListProps {
  brands: { id: string; name: string; slug: string }[];
}

export function BrandsUsingAppList({ brands }: BrandsUsingAppListProps) {
  const t = useTranslations('admin.deliveryApps.detail');
  const { adminSlug } = useParams();

  if (brands.length === 0) {
    return (
      <p className="text-sm text-slate-500 italic py-4">
        {t('noBrands')}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
        {t('brandsUsingTitle')}
      </h4>
      <div className="grid grid-cols-1 gap-2">
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/${adminSlug}/brands?q=${brand.slug}`}
            className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-sky/30 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-navy shadow-sm">
                <Building2 size={16} />
              </div>
              <span className="text-sm font-bold text-slate-700 group-hover:text-navy transition-colors">
                {brand.name}
              </span>
            </div>
            <ChevronRight size={16} className="text-slate-300 group-hover:text-sky transition-all group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
          </Link>
        ))}
      </div>
    </div>
  );
}
