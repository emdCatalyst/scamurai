import { useTranslations } from "next-intl";
import type { OrderRow as OrderRowType } from "@/lib/queries/orders";
import OrderRow from "./OrderRow";
import { Inbox } from "lucide-react";

interface OrdersTableProps {
  orders: OrderRowType[];
  hasActiveFilter: boolean;
}

export default function OrdersTable({ orders, hasActiveFilter }: OrdersTableProps) {
  const t = useTranslations("brand.orders.table");

  if (orders.length === 0) {
    return (
      <div className="bg-[var(--brand-surface)]/50 backdrop-blur-md rounded-3xl border border-dashed border-[var(--brand-border)] py-20 flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 bg-[var(--brand-surface-fg)]/5 rounded-full flex items-center justify-center mb-6">
          <Inbox size={36} className="text-[var(--brand-surface-fg-muted)]" />
        </div>
        <h3 className="text-xl font-bold text-[var(--brand-surface-fg)] mb-2">
          {t("emptyTitle")}
        </h3>
        <p className="text-[var(--brand-surface-fg-muted)] max-w-xs">
          {hasActiveFilter ? t("emptyDescFiltered") : t("emptyDescNoFilter")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--brand-surface)]/50 backdrop-blur-md rounded-3xl border border-[var(--brand-border)] overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-start border-collapse">
          <thead>
            <tr className="border-b border-[var(--brand-border)]">
              <th className="text-start px-6 py-5 text-xs font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-wider">
                {t("orderNumber")}
              </th>
              <th className="text-start px-6 py-5 text-xs font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-wider">
                {t("branch")}
              </th>
              <th className="text-start px-6 py-5 text-xs font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-wider">
                {t("deliveryApp")}
              </th>
              <th className="text-start px-6 py-5 text-xs font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-wider">
                {t("submittedBy")}
              </th>
              <th className="text-start px-6 py-5 text-xs font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-wider">
                {t("amount")}
              </th>
              <th className="text-start px-6 py-5 text-xs font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-wider">
                {t("submitted")}
              </th>
              <th className="text-start px-6 py-5 text-xs font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-wider">
                {t("images")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--brand-border)]">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
