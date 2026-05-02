import { useTranslations, useFormatter } from "next-intl";
import type { OrdersSummary } from "@/lib/queries/orders";

interface OrderSummaryBarProps {
  summary: OrdersSummary;
}

export default function OrderSummaryBar({ summary }: OrderSummaryBarProps) {
  const t = useTranslations("brand.orders.summary");
  const format = useFormatter();

  const currencies = Object.keys(summary.totalsByCurrency);
  const totalParts =
    currencies.length === 0
      ? "—"
      : currencies
          .map((cur) =>
            format.number(summary.totalsByCurrency[cur], {
              style: "currency",
              currency: cur,
              maximumFractionDigits: 2,
            })
          )
          .join(" · ");

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 bg-[var(--brand-surface)]/50 backdrop-blur-md rounded-2xl border border-[var(--brand-border)] text-sm">
      <span className="font-semibold text-[var(--brand-surface-fg)]">
        {t("orders", { count: summary.count })}
      </span>
      <span className="text-[var(--brand-surface-fg-muted)]">·</span>
      <span className="font-bold text-[var(--brand-text-accent)]">
        {t("total", { amount: totalParts })}
      </span>
      <span className="text-[var(--brand-surface-fg-muted)]">·</span>
      <span className="text-[var(--brand-surface-fg-muted)]">
        {t("branches", { count: summary.branchCount })}
      </span>
    </div>
  );
}
