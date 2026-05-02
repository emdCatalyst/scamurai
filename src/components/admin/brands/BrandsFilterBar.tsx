'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, ChevronDown, Check } from 'lucide-react';
import { useDebounceValue } from 'usehooks-ts';

interface BrandsFilterBarProps {
  counts: Record<string, number>;
  currentStatus: string;
  currentPlan: string;
  currentSearch: string;
  currentSort: string;
}

export function BrandsFilterBar({
  counts,
  currentStatus,
  currentPlan,
  currentSearch,
  currentSort,
}: BrandsFilterBarProps) {
  const t = useTranslations('admin.brands.filters');
  const tPlans = useTranslations('plans');
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(currentSearch);
  const [debouncedSearch] = useDebounceValue(search, 300);

  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isPlanOpen, setIsPlanOpen] = useState(false);

  // Update URL search param
  useEffect(() => {
    if (debouncedSearch !== currentSearch) {
      const params = new URLSearchParams(searchParams.toString());
      if (debouncedSearch) {
        params.set('q', debouncedSearch);
      } else {
        params.delete('q');
      }
      params.set('page', '1');
      router.push(`?${params.toString()}`);
    }
  }, [debouncedSearch, currentSearch, router, searchParams]);

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('status', status);
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  };

  const handlePlanChange = (plan: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (plan === 'all') {
      params.delete('plan');
    } else {
      params.set('plan', plan);
    }
    params.set('page', '1');
    router.push(`?${params.toString()}`);
    setIsPlanOpen(false);
  };

  const handleSortChange = (sort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', sort);
    router.push(`?${params.toString()}`);
    setIsSortOpen(false);
  };

  const statuses = ['all', 'active', 'suspended'];
  const plans = ['all', 'starter', 'growth', 'enterprise'];
  const sorts = ['newest', 'oldest', 'name_asc', 'name_desc'];

  return (
    <div className="sticky top-0 z-20 bg-[#f8fafc]/80 backdrop-blur-md border-b border-slate-200 px-4 py-2 md:py-3 flex flex-col xl:flex-row items-stretch xl:items-center gap-2 md:gap-4 justify-between shadow-sm">
      {/* Status Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar whitespace-nowrap">
        {statuses.map((status) => (
          <button
            key={status}
            onClick={() => handleStatusChange(status)}
            className={`px-3 md:px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 shrink-0 ${
              currentStatus === status
                ? 'bg-white text-navy shadow-sm'
                : 'text-slate-500 hover:text-navy'
            }`}
          >
            {t(`status.${status}`)}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              currentStatus === status ? 'bg-navy text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {counts[status] || 0}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 xl:justify-end">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs md:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-sky/50 focus:ring-4 focus:ring-sky/5 rounded-xl text-sm transition-all outline-none"
          />
        </div>

        {/* Plan Filter */}
        <div className="relative w-full sm:w-auto">
          <button
            onClick={() => setIsPlanOpen(!isPlanOpen)}
            className="w-full flex items-center justify-between sm:justify-start gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-all"
          >
            <span className="truncate">
              {currentPlan === 'all' ? t('plan.all') : tPlans(currentPlan as any)}
            </span>
            <ChevronDown size={16} className={`transition-transform shrink-0 ${isPlanOpen ? 'rotate-180' : ''}`} />
          </button>

          {isPlanOpen && (
            <>
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setIsPlanOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                {plans.map((option) => (
                  <button
                    key={option}
                    onClick={() => handlePlanChange(option)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    {option === 'all' ? t('plan.all') : tPlans(option as any)}
                    {currentPlan === option && <Check size={16} className="text-sky" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Sort */}
        <div className="relative w-full sm:w-auto">
          <button
            onClick={() => setIsSortOpen(!isSortOpen)}
            className="w-full flex items-center justify-between sm:justify-start gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-all"
          >
            <span className="truncate">{t(`sort.${currentSort}`)}</span>
            <ChevronDown size={16} className={`transition-transform shrink-0 ${isSortOpen ? 'rotate-180' : ''}`} />
          </button>

          {isSortOpen && (
            <>
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setIsSortOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                {sorts.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleSortChange(option)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    {t(`sort.${option}`)}
                    {currentSort === option && <Check size={16} className="text-sky" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
