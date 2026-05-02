'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, ChevronDown, Check } from 'lucide-react';
import { useDebounceValue } from 'usehooks-ts';

interface UsersFilterBarProps {
  counts: Record<string, number>;
  currentStatus: string;
  currentRole: string;
  currentSearch: string;
  currentSort: string;
  currentBrandId?: string;
  brands?: { id: string, name: string }[];
}

export function UsersFilterBar({
  counts,
  currentStatus,
  currentRole,
  currentSearch,
  currentSort,
  currentBrandId,
  brands = [],
}: UsersFilterBarProps) {
  const t = useTranslations('admin.users.filters');
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(currentSearch);
  const [debouncedSearch] = useDebounceValue(search, 300);

  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [isBrandOpen, setIsBrandOpen] = useState(false);

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

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.set('page', '1');
    router.push(`?${params.toString()}`);
    setIsRoleOpen(false);
    setIsBrandOpen(false);
    setIsSortOpen(false);
  };

  const statuses = ['all', 'active', 'inactive'];
  const roles = ['all', 'brand_admin', 'finance', 'staff'];
  const sorts = ['newest', 'oldest', 'name_asc', 'name_desc'];

  return (
    <div className="sticky top-0 z-20 bg-[#f8fafc]/80 backdrop-blur-md border-b border-slate-200 px-4 py-2 md:py-3 flex flex-col xl:flex-row items-stretch xl:items-center gap-2 md:gap-4 justify-between shadow-sm">
      <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar whitespace-nowrap">
        {statuses.map((status) => (
          <button
            key={status}
            onClick={() => handleFilterChange('status', status)}
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

        <div className="relative w-full sm:w-auto">
          <button
            onClick={() => setIsRoleOpen(!isRoleOpen)}
            className="w-full flex items-center justify-between sm:justify-start gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-all"
          >
            <span className="truncate">{t(`role.${currentRole}`)}</span>
            <ChevronDown size={16} className={`transition-transform shrink-0 ${isRoleOpen ? 'rotate-180' : ''}`} />
          </button>

          {isRoleOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIsRoleOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                {roles.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleFilterChange('role', option)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    {t(`role.${option}`)}
                    {currentRole === option && <Check size={16} className="text-sky" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {brands.length > 0 && (
          <div className="relative w-full sm:w-auto">
            <button
              onClick={() => setIsBrandOpen(!isBrandOpen)}
              className="w-full flex items-center justify-between sm:justify-start gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-all"
            >
              <span className="truncate max-w-[120px]">
                {currentBrandId === 'all' ? t('brand.all') : brands.find(b => b.id === currentBrandId)?.name || t('brand.all')}
              </span>
              <ChevronDown size={16} className={`transition-transform shrink-0 ${isBrandOpen ? 'rotate-180' : ''}`} />
            </button>

            {isBrandOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsBrandOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-[300px] overflow-y-auto">
                  <button
                    onClick={() => handleFilterChange('brand', 'all')}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100"
                  >
                    {t('brand.all')}
                    {currentBrandId === 'all' && <Check size={16} className="text-sky" />}
                  </button>
                  {brands.map((brand) => (
                    <button
                      key={brand.id}
                      onClick={() => handleFilterChange('brand', brand.id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <span className="truncate">{brand.name}</span>
                      {currentBrandId === brand.id && <Check size={16} className="text-sky" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

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
              <div className="fixed inset-0 z-30" onClick={() => setIsSortOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-40 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                {sorts.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleFilterChange('sort', option)}
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
