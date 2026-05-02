"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { useState, useEffect } from "react";
import { useDebounce } from "@/lib/utils";
import BrandSelect from "@/components/brand/ui/BrandSelect";

interface BranchesFilterBarProps {
  tabCounts: {
    all: number;
    active: number;
    inactive: number;
  };
}

export default function BranchesFilterBar({
  tabCounts,
}: BranchesFilterBarProps) {
  const t = useTranslations("brand.branches.filters");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const debouncedSearch = useDebounce(search, 300);

  const currentStatus = searchParams.get("status") || "all";
  const currentSort = searchParams.get("sort") || "newest";

  useEffect(() => {
    if (debouncedSearch === (searchParams.get("q") || "")) return;
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set("q", debouncedSearch);
    } else {
      params.delete("q");
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  }, [debouncedSearch, router, searchParams]);

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "all") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const handleSortChange = (sort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", sort);
    router.push(`?${params.toString()}`);
  };

  const TABS = [
    { id: "all", label: t("status.all"), count: tabCounts.all },
    { id: "active", label: t("status.active"), count: tabCounts.active },
    { id: "inactive", label: t("status.inactive"), count: tabCounts.inactive },
  ];

  const SORT_OPTIONS = [
    { id: "newest", label: t("sort.newest") },
    { id: "oldest", label: t("sort.oldest") },
    { id: "name_asc", label: t("sort.name_asc") },
    { id: "name_desc", label: t("sort.name_desc") },
    { id: "most_orders", label: t("sort.most_orders") },
  ];

  return (
    <div className="relative z-30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[var(--brand-surface)]/50 backdrop-blur-md p-2 rounded-2xl border border-[var(--brand-border)] shadow-sm">
      {/* Status Tabs */}
      <div className="flex p-1 bg-[var(--brand-surface-fg)]/5 rounded-xl overflow-x-auto no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleStatusChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
              currentStatus === tab.id
                ? "bg-[var(--brand-surface)] text-[var(--brand-text-accent)] shadow-sm"
                : "text-[var(--brand-surface-fg-muted)] hover:text-[var(--brand-surface-fg)] hover:bg-[var(--brand-surface)]/50"
            }`}
          >
            {tab.label}
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                currentStatus === tab.id
                  ? "bg-[var(--brand-primary)] text-[var(--brand-primary-fg)]"
                  : "bg-[var(--brand-surface-fg)]/10 text-[var(--brand-surface-fg-muted)]"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-64">
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
          onChange={handleSortChange}
          options={SORT_OPTIONS.map((o) => ({ value: o.id, label: o.label }))}
          panelAlign="end"
        />
      </div>
    </div>
  );
}
