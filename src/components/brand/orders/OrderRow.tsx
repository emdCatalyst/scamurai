"use client";

import Image from "next/image";
import { useFormatter, useTranslations } from "next-intl";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import type {
  OrderRow as OrderRowType,
  OrderStatus,
} from "@/lib/queries/orders";
import { useOrdersDrawer } from "./OrdersDrawerProvider";

interface OrderRowProps {
  order: OrderRowType;
}

export default function OrderRow({ order }: OrderRowProps) {
  const t = useTranslations("brand.orders.imagesStatus");
  const tStatus = useTranslations("brand.orders.status");
  const format = useFormatter();
  const { open } = useOrdersDrawer();

  const openDrawer = () => open(order.id);

  const submittedAt = new Date(order.submittedAt);
  const fullTimestamp = format.dateTime(submittedAt, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const relative = format.relativeTime(submittedAt);

  const amountFormatted = order.subtotal
    ? format.number(Number(order.subtotal), {
        style: "currency",
        currency: order.currency,
        maximumFractionDigits: 2,
      })
    : "—";

  return (
    <tr
      onClick={openDrawer}
      className="cursor-pointer hover:bg-[var(--brand-primary)]/5 transition-colors"
    >
      <td className="px-6 py-4 font-mono text-sm text-[var(--brand-surface-fg)]">
        {order.orderNumber}
      </td>
      <td className="px-6 py-4 text-sm text-[var(--brand-surface-fg)]">
        {order.branchName}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          {order.deliveryAppLogoUrl ? (
            <Image
              src={order.deliveryAppLogoUrl}
              alt=""
              width={20}
              height={20}
              className="rounded object-contain"
            />
          ) : (
            <span className="w-5 h-5 rounded bg-[var(--brand-surface-fg)]/10" />
          )}
          <span className="text-sm text-[var(--brand-surface-fg)]">
            {order.deliveryAppName}
          </span>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-[var(--brand-surface-fg)]">
        {order.submittedByName}
      </td>
      <td className="px-6 py-4 text-sm font-semibold text-[var(--brand-surface-fg)] tabular-nums">
        {amountFormatted}
      </td>
      <td className="px-6 py-4 text-sm text-[var(--brand-surface-fg-muted)]">
        <span title={fullTimestamp}>{relative}</span>
      </td>
      <td className="px-6 py-4">
        <StatusPill status={order.status} label={tStatus(order.status)} />
      </td>
      <td className="px-6 py-4">
        {order.hasBothImages ? (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brand-primary)]"
            title={t("present")}
            aria-label={t("present")}
          >
            <CheckCircle2 size={16} />
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brand-danger)]"
            title={t("missing")}
            aria-label={t("missing")}
          >
            <AlertTriangle size={16} />
          </span>
        )}
      </td>
    </tr>
  );
}

function StatusPill({
  status,
  label,
}: {
  status: OrderStatus;
  label: string;
}) {
  const styles: Record<OrderStatus, string> = {
    needs_review: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    rejected:
      "bg-[var(--brand-danger)]/10 text-[var(--brand-danger)] border-[var(--brand-danger)]/30",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}
    >
      {label}
    </span>
  );
}
