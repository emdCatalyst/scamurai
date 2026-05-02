"use client";

import { useTranslations, useLocale } from "next-intl";
import { Edit2, Power, Trash2, MapPin } from "lucide-react";
import { BranchRow as BranchRowType } from "@/lib/queries/branches";
import { formatDistanceToNow } from "date-fns";
import { arSA, enUS } from "date-fns/locale";

interface BranchRowProps {
  branch: BranchRowType;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDisable: () => void;
}

export default function BranchRow({
  branch,
  onClick,
  onEdit,
  onDelete,
  onDisable,
}: BranchRowProps) {
  const t = useTranslations("brand.branches");
  const locale = useLocale();

  const handleStatusToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDisable();
  };

  const dateLocale = locale === "ar" ? arSA : enUS;

  return (
    <tr
      onClick={onClick}
      className="group hover:bg-[var(--brand-surface)] transition-all cursor-pointer"
    >
      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-surface-fg)]/5 flex items-center justify-center text-[var(--brand-surface-fg-muted)] group-hover:bg-[var(--brand-primary)]/10 group-hover:text-[var(--brand-primary)] transition-colors">
            <MapPin size={20} />
          </div>
          <span className="font-bold text-[var(--brand-surface-fg)]">{branch.name}</span>
        </div>
      </td>
      <td className="px-6 py-5">
        <div
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            branch.isActive
              ? "bg-[#5cbf8f]/10 text-[#5cbf8f]"
              : "bg-[var(--brand-danger)]/10 text-[var(--brand-danger)]"
          }`}
        >
          {branch.isActive ? t("table.statusActive") : t("table.statusInactive")}
        </div>
      </td>
      <td className="px-6 py-5">
        <span className="text-sm font-medium text-[var(--brand-surface-fg)]">
          {branch.assignedStaffCount}
        </span>
      </td>
      <td className="px-6 py-5">
        <span className="text-sm font-medium text-[var(--brand-surface-fg)]">
          {branch.orderCountThisMonth}
        </span>
      </td>
      <td className="px-6 py-5">
        <div className="flex flex-col">
          <span className="text-sm text-[var(--brand-surface-fg-muted)]">
            {formatDistanceToNow(new Date(branch.createdAt), {
              addSuffix: true,
              locale: dateLocale,
            })}
          </span>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 text-[var(--brand-surface-fg-muted)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 rounded-lg transition-all"
            title={t("actions.edit")}
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={handleStatusToggle}
            className={`p-2 rounded-lg transition-all ${
              branch.isActive
                ? "text-[var(--brand-surface-fg-muted)] hover:text-amber-500 hover:bg-amber-50"
                : "text-[var(--brand-surface-fg-muted)] hover:text-[#5cbf8f] hover:bg-[#5cbf8f]/10"
            }`}
            title={branch.isActive ? t("actions.disable") : t("actions.enable")}
          >
            <Power size={18} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 text-[var(--brand-surface-fg-muted)] hover:text-[var(--brand-danger)] hover:bg-[var(--brand-danger)]/10 rounded-lg transition-all"
            title={t("actions.delete")}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
}
