'use client';

import { useTranslations } from 'next-intl';
import { listServices } from '@/lib/services/catalog';
import type { ApplicationListFilters, ApplicationStatusCounts } from '@/lib/queries/applications';
import FilterSelect, { type FilterOption } from './FilterSelect';
import SearchField from './SearchField';
import StatusTabs from './StatusTabs';
import { SORT_OPTIONS, getPlanFilterOptions } from './listFilters';

interface ApplicationsFilterBarProps {
  filters: ApplicationListFilters;
  counts: ApplicationStatusCounts;
  onChange: (changes: Partial<ApplicationListFilters>) => void;
}

export default function ApplicationsFilterBar({ filters, counts, onChange }: ApplicationsFilterBarProps) {
  const t = useTranslations('admin.applications');
  const tServices = useTranslations('services');

  const serviceOptions: FilterOption<ApplicationListFilters['service']>[] = [
    { value: 'all', label: t('filters.allServices') },
    ...listServices().map((service) => ({ value: service.key, label: tServices(`${service.key}.name`) })),
  ];

  const planLabel = (plan: ApplicationListFilters['plan']) => {
    if (plan === 'all') return t('filters.allPlans');
    if (plan === 'none') return t('filters.interestOnly');
    return t(`plans.${plan}`);
  };

  const planOptions: FilterOption<ApplicationListFilters['plan']>[] = getPlanFilterOptions(filters.service).map(
    (plan) => ({ value: plan, label: planLabel(plan) })
  );

  const sortOptions: FilterOption<ApplicationListFilters['sort']>[] = SORT_OPTIONS.map((sort) => ({
    value: sort,
    label: t(`filters.sort.${sort}`),
  }));

  return (
    <section
      aria-label={t('filters.label')}
      className="sticky top-0 z-20 bg-[#f8fafc]/80 backdrop-blur-md border-b border-slate-200 px-4 py-2 md:py-3 flex flex-col xl:flex-row items-stretch xl:items-center gap-2 md:gap-4 justify-between shadow-sm"
    >
      <StatusTabs current={filters.status} counts={counts} onSelect={(status) => onChange({ status })} />

      <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 xl:justify-end">
        <SearchField value={filters.search} onSearch={(search) => onChange({ search })} />
        <FilterSelect
          label={t('filters.serviceLabel')}
          value={filters.service}
          options={serviceOptions}
          onChange={(service) => onChange({ service })}
        />
        {planOptions.length > 1 && (
          <FilterSelect
            label={t('filters.planLabel')}
            value={filters.plan}
            options={planOptions}
            onChange={(plan) => onChange({ plan })}
          />
        )}
        <FilterSelect
          label={t('filters.sortLabel')}
          value={filters.sort}
          options={sortOptions}
          onChange={(sort) => onChange({ sort })}
        />
      </div>
    </section>
  );
}
