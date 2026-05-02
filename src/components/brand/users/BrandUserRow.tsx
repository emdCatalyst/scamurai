"use client";

import { useTranslations, useLocale } from "next-intl";
import { Edit2, Power, Trash2, Shield, RefreshCw } from "lucide-react";
import { BrandUserRow as BrandUserRowType } from "@/lib/queries/brandUsers";
import { formatDistanceToNow } from "date-fns";
import { arSA, enUS } from "date-fns/locale";

interface BrandUserRowProps {
  user: BrandUserRowType;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDisable: () => void;
  onResetPassword: () => void;
}

export default function BrandUserRow({
  user,
  onClick,
  onEdit,
  onDelete,
  onDisable,
  onResetPassword,
}: BrandUserRowProps) {
  const t = useTranslations("brand.users");
  const locale = useLocale();

  const handleStatusToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDisable();
  };

  const handleResetPassword = (e: React.MouseEvent) => {
    e.stopPropagation();
    onResetPassword();
  };

  const dateLocale = locale === "ar" ? arSA : enUS;

  return (
    <tr
      onClick={onClick}
      className="group hover:bg-[var(--brand-background-active)] transition-all cursor-pointer"
    >
      <td className="ps-6 pe-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-surface)] flex items-center justify-center text-[var(--brand-surface-fg-muted)] group-hover:bg-[var(--brand-primary)]/10 group-hover:text-[var(--brand-primary)] transition-colors font-bold uppercase">
            {user.fullName.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-[var(--brand-background-fg)]">{user.fullName}</div>
            <div className="text-xs text-[var(--brand-background-fg-muted)]">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="ps-6 pe-6 py-5">
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            user.role === "finance"
              ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
              : "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
          }`}
        >
          <Shield size={12} />
          {user.role === "finance" ? t("roles.finance") : t("roles.staff")}
        </div>
      </td>
      <td className="ps-6 pe-6 py-5">
        <span className="text-sm font-medium text-[var(--brand-background-fg)]">
          {user.branchName ? user.branchName : "—"}
        </span>
      </td>
      <td className="ps-6 pe-6 py-5">
        <div
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            user.isActive
              ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
              : "bg-[var(--brand-danger)]/10 text-[var(--brand-danger)]"
          }`}
        >
          {user.isActive ? t("status.active") : t("status.inactive")}
        </div>
      </td>
      <td className="ps-6 pe-6 py-5">
        <div
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            user.mustChangePassword
              ? "bg-amber-500/10 text-amber-600"
              : "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
          }`}
        >
          {user.mustChangePassword ? t("password.temporary") : t("password.set")}
        </div>
      </td>
      <td className="ps-6 pe-6 py-5">
        <div className="flex flex-col">
          <span className="text-sm text-[var(--brand-background-fg-muted)]">
            {user.joinedAt
              ? formatDistanceToNow(new Date(user.joinedAt), {
                  addSuffix: true,
                  locale: dateLocale,
                })
              : t("notLoggedIn")}
          </span>
        </div>
      </td>
      <td className="ps-6 pe-6 py-5">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 text-[var(--brand-background-fg-muted)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 rounded-lg transition-all"
            title={t("actions.edit")}
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={handleResetPassword}
            className="p-2 text-[var(--brand-background-fg-muted)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 rounded-lg transition-all"
            title={t("actions.resetPassword")}
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={handleStatusToggle}
            className={`p-2 rounded-lg transition-all ${
              user.isActive
                ? "text-[var(--brand-background-fg-muted)] hover:text-amber-500 hover:bg-amber-500/10"
                : "text-[var(--brand-background-fg-muted)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10"
            }`}
            title={user.isActive ? t("actions.disable") : t("actions.enable")}
          >
            <Power size={18} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 text-[var(--brand-background-fg-muted)] hover:text-[var(--brand-danger)] hover:bg-[var(--brand-danger)]/10 rounded-lg transition-all"
            title={t("actions.delete")}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </td>
    </tr>
  );
}
