"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X, Loader2, Power } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BrandUserRow } from "@/lib/queries/brandUsers";
import { setBrandUserStatus } from "@/actions/brand/setBrandUserStatus";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";

interface DisableBrandUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: BrandUserRow;
}

export default function DisableBrandUserModal({
  isOpen,
  onClose,
  user,
}: DisableBrandUserModalProps) {
  const t = useTranslations("brand.users");
  const { toast } = useToast();
  const router = useRouter();
  const [isSettingStatus, setIsSettingStatus] = useState(false);

  const handleStatusToggle = async () => {
    if (!user?.id) return;
    setIsSettingStatus(true);
    try {
      const res = await setBrandUserStatus({
        userId: user.id,
        isActive: !user.isActive,
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

  const isDisable = user?.isActive;

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
            className={`absolute inset-0 bg-[var(--brand-background-fg)]/40 backdrop-blur-sm ${!isSettingStatus ? "cursor-pointer" : "cursor-wait"}`}
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
            <div className="ps-6 pe-6 py-4 border-b border-[var(--brand-border)] flex items-center justify-between bg-[var(--brand-background)]/50">
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
              <div className={`flex gap-4 p-4 rounded-2xl border ${isDisable ? 'bg-amber-500/5 border-amber-500/10' : 'bg-[var(--brand-primary)]/5 border-[var(--brand-primary)]/10'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDisable ? 'bg-amber-500/10 text-amber-600' : 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'}`}>
                  <Power size={20} />
                </div>
                <div>
                  <h4 className={`font-bold text-sm ${isDisable ? 'text-amber-900' : 'text-[var(--brand-primary)]'}`}>
                    {isDisable ? t("disable.title") : t("enable.title")}
                  </h4>
                  <p className={`text-xs mt-0.5 leading-relaxed ${isDisable ? 'text-amber-700/80' : 'text-[var(--brand-primary)]/80'}`}>
                    {isDisable ? t("disable.desc", { name: user?.fullName }) : t("enable.desc", { name: user?.fullName })}
                  </p>
                </div>
              </div>
            </div>

            <div className="ps-6 pe-6 py-4 bg-[var(--brand-background)]/50 flex justify-end gap-3 border-t border-[var(--brand-border)]">
              <button
                onClick={onClose}
                disabled={isSettingStatus}
                className="ps-4 pe-4 py-2 text-sm font-bold text-[var(--brand-background-fg-muted)] hover:text-[var(--brand-background-fg)] transition-colors disabled:opacity-50"
              >
                {t("disable.btnCancel")}
              </button>
              <button
                onClick={handleStatusToggle}
                disabled={isSettingStatus}
                className={`ps-6 pe-6 py-2 text-[var(--brand-primary-fg)] rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2 ${
                  isDisable 
                    ? 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20' 
                    : 'bg-[var(--brand-primary)] hover:opacity-90 shadow-lg shadow-[var(--brand-primary)]/20'
                }`}
              >
                {isSettingStatus ? (
                  <Loader2 size={16} className="animate-spin" />
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
