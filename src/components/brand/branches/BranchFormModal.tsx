"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BranchRow } from "@/lib/queries/branches";
import { createBranch } from "@/actions/brand/createBranch";
import { updateBranch } from "@/actions/brand/updateBranch";
import { useToast } from "@/components/ui/Toast";
import { branchSchema } from "@/lib/validations/branch";

interface BranchFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandId: string;
  branch?: BranchRow;
}

export default function BranchFormModal({
  isOpen,
  onClose,
  branch,
}: BranchFormModalProps) {
  const t = useTranslations("brand.branches.form");
  const tActions = useTranslations("brand.branches.actions");
  const { toast } = useToast();
  const [name, setName] = useState(branch?.name || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = !!branch;

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setName(branch?.name || "");
        setErrors({});
      }, 0);
    }
  }, [isOpen, branch]);

  const validate = () => {
    const parsed = branchSchema.safeParse({ name });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      if (isEdit && name === branch.name) {
        onClose();
        return;
      }

      const result = isEdit
        ? await updateBranch({ id: branch.id, name })
        : await createBranch({ name });

      if (result.success) {
        toast(
          isEdit
            ? tActions("successUpdated")
            : tActions("successCreated"),
          "success"
        );
        onClose();
      } else {
        setErrors({ global: result.error });
      }
    } catch {
      setErrors({ global: tActions("error") });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSubmitting && onClose()}
            className={`absolute inset-0 bg-[var(--brand-background)]/40 backdrop-blur-sm ${!isSubmitting ? "cursor-pointer" : "cursor-wait"}`}
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
            <div className="px-6 py-4 border-b border-[var(--brand-border)] flex items-center justify-between bg-[var(--brand-surface-fg)]/5">
              <h3 className="text-lg font-bold text-[var(--brand-surface-fg)]">
                {isEdit ? t("editTitle") : t("createTitle")}
              </h3>
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="p-2 -me-2 text-[var(--brand-surface-fg-muted)] hover:text-[var(--brand-surface-fg)] transition-colors disabled:opacity-30 disabled:cursor-wait"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-wider ps-1">
                  {t("fieldName")}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) validate();
                  }}
                  onBlur={validate}
                  placeholder={t("namePlaceholder")}
                  className={`w-full px-4 py-3 bg-[var(--brand-surface-fg)]/5 border-2 rounded-2xl text-sm transition-all outline-none font-medium ${
                    errors.name
                      ? "border-[var(--brand-danger)]/30 focus:border-[var(--brand-danger)] focus:ring-4 focus:ring-[var(--brand-danger)]/5"
                      : "border-transparent focus:bg-[var(--brand-surface)] focus:border-[var(--brand-primary)]/50 focus:ring-4 focus:ring-[var(--brand-primary)]/5"
                  }`}
                  autoFocus
                />
                {errors.name && (
                  <p className="text-xs text-[var(--brand-danger)] font-medium ps-1">
                    {errors.name}
                  </p>
                )}
              </div>

              {errors.global && (
                <div className="p-3 rounded-xl bg-[var(--brand-danger)]/10 border border-[var(--brand-danger)]/20 text-[var(--brand-danger)] text-xs font-medium">
                  {errors.global}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[var(--brand-primary)] text-[var(--brand-primary-fg)] rounded-2xl font-bold hover:brightness-95 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ boxShadow: `0 10px 15px -3px var(--brand-primary), 0 4px 6px -4px var(--brand-primary)` }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      {t("submitting")}
                    </>
                  ) : isEdit ? (
                    t("btnUpdate")
                  ) : (
                    t("btnCreate")
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
