"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { 
  MapPin, 
  Users, 
  Calendar, 
  Edit2, 
  Power, 
  Trash2,
  Loader2,
  ExternalLink
} from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import { BranchRow } from "@/lib/queries/branches";
import { getBranchDetails } from "@/actions/brand/getBranchDetails";
import { useToast } from "@/components/ui/Toast";
import { format } from "date-fns";
import { arSA, enUS } from "date-fns/locale";
import Link from "next/link";

interface BranchDetails {
  success: boolean;
  branch: BranchRow;
  stats: {
    ordersThisMonth: number;
    totalOrders: number;
  };
  staff: {
    id: string;
    fullName: string;
    email: string;
    isActive: boolean;
  }[];
}

interface BranchDetailDrawerProps {
  branch: BranchRow;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDisable: () => void;
}

export default function BranchDetailDrawer({
  branch: initialBranch,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onDisable,
}: BranchDetailDrawerProps) {
  const t = useTranslations("brand.branches");
  const locale = useLocale();
  const { toast } = useToast();
  
  const [details, setDetails] = useState<BranchDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && initialBranch?.id) {
      // Avoid cascading render by only setting loading if we actually need to fetch
      setIsLoading(true);
      getBranchDetails(initialBranch.id).then((res) => {
        if (res.success) {
          setDetails(res as unknown as BranchDetails);
        } else {
          toast(res.error || "Failed to fetch details", "error");
          onClose();
        }
        setIsLoading(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialBranch?.id]);

  const handleStatusToggle = () => {
    onDisable();
  };

  const dateLocale = locale === "ar" ? arSA : enUS;

  const branch = details?.branch || initialBranch;

  const canClose = true;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      canClose={canClose}
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center text-[var(--brand-primary)]">
            <MapPin size={20} />
          </div>
          <div>
            <h2 className="font-bold text-[var(--brand-surface-fg)] truncate">{branch?.name || ""}</h2>
            <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
              branch?.isActive 
                ? "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]" 
                : "bg-[var(--brand-danger)]/10 text-[var(--brand-danger)]"
            }`}>
              {branch?.isActive ? t("table.statusActive") : t("table.statusInactive")}
            </div>
          </div>
        </div>
      }
    >
      {isLoading || !details ? (
        <div className="h-64 flex flex-col items-center justify-center gap-3">
          <Loader2 size={32} className="animate-spin text-[var(--brand-primary)]" />
          <p className="text-sm font-medium text-[var(--brand-surface-fg-muted)]">Loading branch details...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[var(--brand-surface)] p-4 rounded-2xl border border-[var(--brand-border)] shadow-sm">
              <p className="text-[10px] font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-wider mb-1">
                {t("detail.ordersMonth")}
              </p>
              <p className="text-2xl font-black text-[var(--brand-surface-fg)]">{details?.stats?.ordersThisMonth}</p>
            </div>
            <div className="bg-[var(--brand-surface)] p-4 rounded-2xl border border-[var(--brand-border)] shadow-sm">
              <p className="text-[10px] font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-wider mb-1">
                {t("detail.ordersTotal")}
              </p>
              <p className="text-2xl font-black text-[var(--brand-surface-fg)]">{details?.stats?.totalOrders}</p>
            </div>
          </div>

          {/* Info Section */}
          <section className="space-y-4">
            <h3 className="text-xs font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-widest flex items-center gap-2">
              <Calendar size={14} />
              {t("detail.info")}
            </h3>
            <div className="bg-[var(--brand-surface)] rounded-2xl border border-[var(--brand-border)] divide-y divide-[var(--brand-border)] overflow-hidden shadow-sm">
              <div className="px-5 py-4 flex items-center justify-between">
                <span className="text-sm text-[var(--brand-surface-fg-muted)]">{t("detail.created")}</span>
                <span className="text-sm font-bold text-[var(--brand-surface-fg)]">
                  {format(new Date(branch.createdAt), "PPP", { locale: dateLocale })}
                </span>
              </div>
            </div>
          </section>

          {/* Staff Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-widest flex items-center gap-2">
                <Users size={14} />
                {t("detail.staffTitle")}
              </h3>
              {details?.staff && details.staff.length > 0 && (
                <Link 
                  href={`./users?branch=${branch.id}`}
                  className="text-[10px] font-bold text-[var(--brand-primary)] hover:underline flex items-center gap-1"
                >
                  {t("detail.viewStaff")}
                  <ExternalLink size={10} />
                </Link>
              )}
            </div>

            <div className="space-y-2">
              {!details?.staff || details.staff.length === 0 ? (
                <div className="bg-[var(--brand-surface)]/50 border border-dashed border-[var(--brand-border)] rounded-2xl p-6 text-center">
                  <p className="text-sm text-[var(--brand-surface-fg-muted)] font-medium">{t("detail.noStaff")}</p>
                </div>
              ) : (
                details.staff.map((s) => (
                  <div key={s.id} className="bg-[var(--brand-surface)] p-4 rounded-2xl border border-[var(--brand-border)] shadow-sm flex items-center justify-between group hover:border-[var(--brand-primary)]/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[var(--brand-surface-fg)]/5 border border-[var(--brand-border)] flex items-center justify-center text-[var(--brand-surface-fg-muted)]">
                        {s.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[var(--brand-surface-fg)] text-sm truncate">{s.fullName}</p>
                        <p className="text-[var(--brand-surface-fg-muted)] text-[10px] truncate">{s.email}</p>
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${s.isActive ? "bg-[var(--brand-primary)] shadow-[0_0_8px_var(--brand-primary)]" : "bg-[var(--brand-surface-fg)]/20"}`} />
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Actions Footer (Inside Drawer Content) */}
          <div className="pt-8 grid grid-cols-2 gap-3">
            <button
              onClick={onEdit}
              className="flex items-center justify-center gap-2 py-3.5 bg-[var(--brand-surface)] border-2 border-[var(--brand-border)] rounded-2xl text-sm font-bold text-[var(--brand-surface-fg)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-all"
            >
              <Edit2 size={16} />
              {t("actions.edit")}
            </button>
            <button
              onClick={handleStatusToggle}
              className={`flex items-center justify-center gap-2 py-3.5 border-2 rounded-2xl text-sm font-bold transition-all disabled:opacity-50 ${
                branch.isActive
                  ? "bg-[var(--brand-danger)]/5 border-[var(--brand-danger)]/10 text-[var(--brand-danger)] hover:bg-[var(--brand-danger)]/10"
                  : "bg-[var(--brand-primary)]/5 border-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10"
              }`}
            >
              <Power size={16} />
              {branch.isActive ? t("actions.disable") : t("actions.enable")}
            </button>
            <button
              onClick={onDelete}
              className="col-span-2 flex items-center justify-center gap-2 py-3.5 bg-[var(--brand-danger)]/5 border-2 border-[var(--brand-danger)]/20 rounded-2xl text-sm font-bold text-[var(--brand-danger)] hover:bg-[var(--brand-danger)]/10 transition-all mt-2"
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
