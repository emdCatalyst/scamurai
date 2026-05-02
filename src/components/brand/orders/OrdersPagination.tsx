"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface OrdersPaginationProps {
  total: number;
  pageSize: number;
  currentPage: number;
  locale: string;
}

export default function OrdersPagination({
  total,
  pageSize,
  currentPage,
  locale,
}: OrdersPaginationProps) {
  const t = useTranslations("brand.orders.pagination");
  const router = useRouter();
  const searchParams = useSearchParams();

  const totalPages = Math.ceil(total / pageSize);
  if (total === 0) return null;

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`?${params.toString()}`);
  };

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);
  const isAr = locale === "ar";

  const PrevIcon = isAr ? ChevronRight : ChevronLeft;
  const NextIcon = isAr ? ChevronLeft : ChevronRight;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-6">
      <p className="text-sm text-[var(--brand-surface-fg-muted)] order-2 sm:order-1">
        {t("showing", { start, end, total })}
      </p>

      <div className="flex items-center gap-1 order-1 sm:order-2">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 text-[var(--brand-surface-fg-muted)] hover:text-[var(--brand-text-accent)] hover:bg-[var(--brand-surface)] rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Previous page"
        >
          <PrevIcon size={20} />
        </button>

        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum = i + 1;
            if (totalPages > 5 && currentPage > 3) {
              pageNum = currentPage - 3 + i + 1;
              if (pageNum > totalPages) pageNum = totalPages - (4 - i);
            }

            return (
              <button
                key={pageNum}
                onClick={() => handlePageChange(pageNum)}
                className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
                  currentPage === pageNum
                    ? "bg-[var(--brand-text-accent)] text-[var(--brand-primary-fg)] shadow-lg"
                    : "text-[var(--brand-surface-fg-muted)] hover:bg-[var(--brand-surface)] hover:text-[var(--brand-text-accent)]"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 text-[var(--brand-surface-fg-muted)] hover:text-[var(--brand-text-accent)] hover:bg-[var(--brand-surface)] rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Next page"
        >
          <NextIcon size={20} />
        </button>
      </div>
    </div>
  );
}
