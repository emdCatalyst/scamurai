"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X, Loader2, Power } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BranchRow } from "@/lib/queries/branches";
import { setBranchStatus } from "@/actions/brand/setBranchStatus";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";

interface DisableBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  branch: BranchRow;
}

export default function DisableBranchModal({
  isOpen,
  onClose,
  branch,
}: DisableBranchModalProps) {
  const t = useTranslations("brand.branches");
  const { toast } = useToast();
  const router = useRouter();
  const [isSettingStatus, setIsSettingStatus] = useState(false);

  const handleStatusToggle = async () => {
    if (!branch?.id) return;
    setIsSettingStatus(true);
    try {
      const res = await setBranchStatus({
        branchId: branch.id,
        isActive: !branch.isActive,
      });
      if (res.success) {
        toast(t("actions.successStatus"), "success");
        router.refresh();
        onClose();
      } else {
        toast(res.error || t("actions.error"), "error");
      }
    } catch {
      toast(t("actions.error"), "error");
    } finally {
      setIsSettingStatus(false);
    }
  };

  const isDisable = branch?.isActive;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSettingStatus && onClose()}
            className={`absolute inset-0 bg-black/40 backdrop-blur-sm ${!isSettingStatus ? "cursor-pointer" : "cursor-wait"}`}
          />
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ 
              layout: { duration: 0.3, ease: "easeOut" },
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 },
              y: { duration: 0.2 }
            }}
            className="relative w-full max-w-md bg-[var(--brand-surface)] rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--brand-border)] flex items-center justify-between bg-[var(--brand-surface-fg-muted)]/5">
              <h3 className="text-lg font-bold text-[var(--brand-surface-fg)]">
                {isDisable ? t("actions.disable") : t("actions.enable")}
              </h3>
              <button
                onClick={onClose}
                disabled={isSettingStatus}
                className="p-2 -me-2 text-[var(--brand-surface-fg-muted)] hover:text-[var(--brand-surface-fg)] transition-colors disabled:opacity-30 disabled:cursor-wait"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className={`flex gap-4 p-4 rounded-2xl border ${isDisable ? 'bg-[var(--brand-danger)]/10 border-[var(--brand-danger)]/20' : 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/20'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDisable ? 'bg-[var(--brand-danger)]/20 text-[var(--brand-danger)]' : 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]'}`}>
                  <Power size={20} />
                </div>
                <div>
                  <h4 className={`font-bold text-sm ${isDisable ? 'text-[var(--brand-danger)]' : 'text-[var(--brand-primary)]'}`}>
                    {isDisable ? t("actions.confirmDisable") : t("actions.confirmEnable")}
                  </h4>
                  <p className={`text-xs mt-0.5 leading-relaxed ${isDisable ? 'text-[var(--brand-danger)]/80' : 'text-[var(--brand-primary)]/80'}`}>
                    {branch?.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-[var(--brand-surface-fg-muted)]/5 flex justify-end gap-3 border-t border-[var(--brand-border)]">
              <button
                onClick={onClose}
                disabled={isSettingStatus}
                className="px-4 py-2 text-sm font-bold text-[var(--brand-surface-fg-muted)] hover:text-[var(--brand-surface-fg)] transition-colors disabled:opacity-50"
              >
                {t("delete.btnCancel")}
              </button>
              <button
                onClick={handleStatusToggle}
                disabled={isSettingStatus}
                className={`px-6 py-2 text-[var(--brand-primary-fg)] rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2 ${
                  isDisable 
                    ? 'bg-[var(--brand-danger)] hover:brightness-95 shadow-lg shadow-[var(--brand-danger)]/20 text-[var(--brand-danger-fg)]' 
                    : 'bg-[var(--brand-primary)] hover:brightness-95 shadow-lg shadow-[var(--brand-primary)]/20'
                }`}
              >
                {isSettingStatus ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                  </>
                ) : (
                  isDisable ? t("actions.disable") : t("actions.enable")
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
