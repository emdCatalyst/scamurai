"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { useDebounce } from "@/lib/utils";
import BrandSelect from "@/components/brand/ui/BrandSelect";
import DateRangePicker from "./DateRangePicker";

type Option = { id: string; name: string; logoUrl?: string | null };

interface OrdersFilterBarProps {
  branchOptions: Option[];
  appOptions: Option[];
  currentSearch: string;
  currentBranch: string;
  currentApp: string;
  currentDateFrom: string;
  currentDateTo: string;
  currentSort: string;
}

export default function OrdersFilterBar({
  branchOptions,
  appOptions,
  currentSearch,
  currentBranch,
  currentApp,
  currentDateFrom,
  currentDateTo,
  currentSort,
}: OrdersFilterBarProps) {
  const t = useTranslations("brand.orders.filters");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(currentSearch);
  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (debouncedSearch === (searchParams.get("q") || "")) return;
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) params.set("q", debouncedSearch);
    else params.delete("q");
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  }, [debouncedSearch, router, searchParams]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const SORT_OPTIONS = [
    { id: "newest", label: t("sort.newest") },
    { id: "oldest", label: t("sort.oldest") },
    { id: "amount_high", label: t("sort.amount_high") },
    { id: "amount_low", label: t("sort.amount_low") },
  ];

  return (
    <div className="relative z-30 flex flex-col gap-4 bg-[var(--brand-surface)]/50 backdrop-blur-md p-3 rounded-2xl border border-[var(--brand-border)] shadow-sm">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative w-full sm:flex-1">
          <Search
            className="absolute top-1/2 -translate-y-1/2 text-[var(--brand-surface-fg-muted)] start-3"
            size={18}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-xl py-2.5 ps-10 pe-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all text-[var(--brand-surface-fg)] placeholder:text-[var(--brand-surface-fg-muted)]"
          />
        </div>

        {/* Sort */}
        <BrandSelect
          value={currentSort}
          onChange={(v) => updateParam("sort", v)}
          options={SORT_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          panelAlign="end"
        />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 pt-3 border-t border-[var(--brand-border)]">
        {/* Branch Filter */}
        <BrandSelect
          value={currentBranch || "all"}
          onChange={(v) => updateParam("branch", v)}
          options={[
            { value: "all", label: t("allBranches") },
            ...branchOptions.map((b) => ({ value: b.id, label: b.name })),
          ]}
          className="lg:w-56"
        />

        {/* Delivery App Filter */}
        <BrandSelect
          value={currentApp || "all"}
          onChange={(v) => updateParam("app", v)}
          options={[
            { value: "all", label: t("allApps") },
            ...appOptions.map((a) => ({ value: a.id, label: a.name })),
          ]}
          className="lg:w-56"
        />

        {/* Date Range */}
        <DateRangePicker
          dateFrom={currentDateFrom}
          dateTo={currentDateTo}
        />
      </div>
    </div>
  );
}
