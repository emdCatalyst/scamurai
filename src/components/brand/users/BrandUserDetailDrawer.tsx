"use client";

import { useTranslations, useLocale } from "next-intl";
import { 
  Shield, 
  MapPin, 
  Calendar, 
  Edit2, 
  Power, 
  Trash2,
  RefreshCw,
  Mail,
  Copy,
  CheckCircle2
} from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import { BrandUserRow } from "@/lib/queries/brandUsers";
import { useState } from "react";
import { format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";

interface BrandUserDetailDrawerProps {
  user: BrandUserRow;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDisable: () => void;
  onResetPassword: () => void;
}

export default function BrandUserDetailDrawer({
  user,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onDisable,
  onResetPassword,
}: BrandUserDetailDrawerProps) {
  const t = useTranslations("brand.users");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);

  const dateLocale = locale === "ar" ? arSA : enUS;

  const copyEmail = () => {
    navigator.clipboard.writeText(user.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={t("detail.info")}
    >
      {user && (
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[var(--brand-surface)]">
            {/* Header / Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[var(--brand-background)] flex items-center justify-center text-[var(--brand-background-fg-muted)] font-black text-2xl uppercase">
                {user.fullName.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--brand-surface-fg)]">{user.fullName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    user.role === "finance" ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" : "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                  }`}>
                    <Shield size={12} />
                    {user.role === "finance" ? t("roles.finance") : t("roles.staff")}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    user.isActive ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" : "bg-[var(--brand-danger)]/10 text-[var(--brand-danger)]"
                  }`}>
                    {user.isActive ? t("status.active") : t("status.inactive")}
                  </span>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="bg-[var(--brand-background)]/50 rounded-2xl p-4 space-y-4 border border-[var(--brand-border)]">
              {/* Email */}
              <div className="flex items-start gap-3">
                <div className="p-2 bg-[var(--brand-surface)] rounded-lg text-[var(--brand-surface-fg-muted)] shrink-0 shadow-sm">
                  <Mail size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[var(--brand-background-fg-muted)] uppercase tracking-wider">{t("detail.email")}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm font-medium text-[var(--brand-background-fg)] truncate">{user.email}</p>
                    <button 
                      onClick={copyEmail}
                      className="text-[var(--brand-background-fg-muted)] hover:text-[var(--brand-background-fg)] transition-colors"
                      title={t("detail.copyEmail")}
                    >
                      {copied ? <CheckCircle2 size={14} className="text-[var(--brand-primary)]" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Branch */}
              <div className="flex items-start gap-3 pt-4 border-t border-[var(--brand-border)]">
                <div className="p-2 bg-[var(--brand-surface)] rounded-lg text-[var(--brand-surface-fg-muted)] shrink-0 shadow-sm">
                  <MapPin size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--brand-background-fg-muted)] uppercase tracking-wider">{t("detail.branch")}</p>
                  <p className="text-sm font-medium text-[var(--brand-background-fg)] mt-0.5">{user.branchName || "—"}</p>
                </div>
              </div>

              {/* Password Status */}
              <div className="flex items-start gap-3 pt-4 border-t border-[var(--brand-border)]">
                <div className="p-2 bg-[var(--brand-surface)] rounded-lg text-[var(--brand-surface-fg-muted)] shrink-0 shadow-sm">
                  <Shield size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--brand-background-fg-muted)] uppercase tracking-wider">{t("detail.passwordStatus")}</p>
                  <p className="text-sm font-medium text-[var(--brand-background-fg)] mt-0.5">
                    {user.mustChangePassword ? t("password.temporary") : t("password.set")}
                  </p>
                </div>
              </div>

              {/* Joined */}
              <div className="flex items-start gap-3 pt-4 border-t border-[var(--brand-border)]">
                <div className="p-2 bg-[var(--brand-surface)] rounded-lg text-[var(--brand-surface-fg-muted)] shrink-0 shadow-sm">
                  <Calendar size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--brand-background-fg-muted)] uppercase tracking-wider">{t("detail.joined")}</p>
                  <p className="text-sm font-medium text-[var(--brand-background-fg)] mt-0.5">
                    {user.joinedAt 
                      ? format(new Date(user.joinedAt), "PPp", { locale: dateLocale }) 
                      : t("notLoggedIn")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-[var(--brand-border)] bg-[var(--brand-surface)] grid grid-cols-2 gap-3 shrink-0">
            <button
              onClick={onEdit}
              className="flex items-center justify-center gap-2 py-3.5 border border-[var(--brand-border)] rounded-2xl text-sm font-bold text-[var(--brand-surface-fg)] hover:bg-[var(--brand-background-active)] transition-all col-span-2"
            >
              <Edit2 size={16} />
              {t("actions.edit")}
            </button>
            <button
              onClick={onResetPassword}
              className="flex items-center justify-center gap-2 py-3.5 border-2 border-[var(--brand-primary)]/20 bg-[var(--brand-primary)]/5 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 rounded-2xl text-sm font-bold transition-all col-span-2"
            >
              <RefreshCw size={16} />
              {t("actions.resetPassword")}
            </button>
            <button
              onClick={onDisable}
              className={`flex items-center justify-center gap-2 py-3.5 border-2 rounded-2xl text-sm font-bold transition-all ${
                user.isActive
                  ? "bg-[var(--brand-danger)]/5 border-[var(--brand-danger)]/10 text-[var(--brand-danger)] hover:bg-[var(--brand-danger)]/10"
                  : "bg-[var(--brand-primary)]/5 border-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10"
              }`}
            >
              <Power size={16} />
              {user.isActive ? t("actions.disable") : t("actions.enable")}
            </button>
            <button
              onClick={onDelete}
              className="flex items-center justify-center gap-2 py-3.5 border-2 bg-[var(--brand-danger)]/5 border-[var(--brand-danger)]/20 text-[var(--brand-danger)] hover:bg-[var(--brand-danger)]/10 rounded-2xl text-sm font-bold transition-all"
            >
              <Trash2 size={16} />
              {t("actions.delete")}
            </button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
