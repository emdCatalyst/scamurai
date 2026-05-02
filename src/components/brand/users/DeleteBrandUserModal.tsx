"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X, Loader2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BrandUserRow } from "@/lib/queries/brandUsers";
import { deleteBrandUser } from "@/actions/brand/deleteBrandUser";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";

interface DeleteBrandUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: BrandUserRow;
}

export default function DeleteBrandUserModal({
  isOpen,
  onClose,
  user,
}: DeleteBrandUserModalProps) {
  const t = useTranslations("brand.users.delete");
  const { toast } = useToast();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!user?.id) return;
    setIsDeleting(true);
    try {
      const res = await deleteBrandUser({ userId: user.id });
      if (res.success) {
        toast(t("successDeleted"), "success");
        router.refresh();
        onClose();
      } else {
        toast(res.error || t("errorDeleted"), "error");
      }
    } catch {
      toast(t("errorDeleted"), "error");
    } finally {
      setIsDeleting(false);
    }
  };

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
            onClick={() => !isDeleting && onClose()}
            className={`absolute inset-0 bg-[var(--brand-background-fg)]/40 backdrop-blur-sm ${!isDeleting ? "cursor-pointer" : "cursor-wait"}`}
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
                {t("title")}
              </h3>
              <button
                onClick={onClose}
                disabled={isDeleting}
                className="p-2 -me-2 text-[var(--brand-surface-fg-muted)] hover:text-[var(--brand-surface-fg)] transition-colors disabled:opacity-30 disabled:cursor-wait"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="flex gap-4 p-4 rounded-2xl border bg-[var(--brand-danger)]/5 border-[var(--brand-danger)]/10">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[var(--brand-danger)]/10 text-[var(--brand-danger)]">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[var(--brand-danger)]">
                    {t("confirmTitle")}
                  </h4>
                  <p className="text-xs mt-0.5 leading-relaxed text-[var(--brand-danger)]/80">
                    {t("confirmDesc", { name: user?.fullName })}
                  </p>
                </div>
              </div>
            </div>

            <div className="ps-6 pe-6 py-4 bg-[var(--brand-background)]/50 flex justify-end gap-3 border-t border-[var(--brand-border)]">
              <button
                onClick={onClose}
                disabled={isDeleting}
                className="ps-4 pe-4 py-2 text-sm font-bold text-[var(--brand-background-fg-muted)] hover:text-[var(--brand-background-fg)] transition-colors disabled:opacity-50"
              >
                {t("btnCancel")}
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="ps-6 pe-6 py-2 text-[var(--brand-danger-fg)] rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2 bg-[var(--brand-danger)] hover:opacity-90 shadow-lg shadow-[var(--brand-danger)]/20"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    {t("deleting")}
                  </>
                ) : (
                  t("btnConfirm")
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
