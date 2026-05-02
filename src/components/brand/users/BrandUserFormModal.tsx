"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";
import { BrandUserRow } from "@/lib/queries/brandUsers";
import { createBrandUser } from "@/actions/brand/createBrandUser";
import { updateBrandUser } from "@/actions/brand/updateBrandUser";
import { brandUserSchema } from "@/lib/validations/brandUser";

interface BrandUserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: BrandUserRow;
  branches: { id: string; name: string }[];
}

export default function BrandUserFormModal({
  isOpen,
  onClose,
  user,
  branches,
}: BrandUserFormModalProps) {
  const t = useTranslations("brand.users.form");
  const { toast } = useToast();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"finance" | "staff">("staff");
  const [branchId, setBranchId] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEdit = !!user;

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setFullName(user?.fullName || "");
        setEmail(user?.email || "");
        setRole(user?.role || "staff");
        setBranchId(user?.branchId || "");
        setErrors({});
      }, 0);
    }
  }, [isOpen, user]);

  const validate = () => {
    const parsed = brandUserSchema.safeParse({ fullName, email, role, branchId: branchId || null });
    if (!parsed.success) {
      const newErrors: Record<string, string> = {};
      parsed.error.errors.forEach((err) => {
        if (err.path[0]) newErrors[err.path[0].toString()] = err.message;
      });
      setErrors(newErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast("Please check the form for errors", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        fullName,
        email,
        role,
        branchId: branchId || null,
      };

      const res = isEdit && user
        ? await updateBrandUser(user.id, payload)
        : await createBrandUser(payload);

      if (res.success) {
        toast(isEdit ? t("successUpdated") : t("successCreated"), "success");
        router.refresh();
        onClose();
      } else {
        if (res.error === "plan_limit") {
          toast(t("errorLimit"), "error");
        } else {
          toast(res.error || t("error"), "error");
        }
      }
    } catch {
      toast(t("error"), "error");
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
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSubmitting && onClose()}
            className={`absolute inset-0 bg-[var(--brand-background-fg)]/40 backdrop-blur-sm ${!isSubmitting ? "cursor-pointer" : "cursor-wait"}`}
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

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-wider mb-2">
                    {t("fieldName")}
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors({ ...errors, fullName: "" });
                    }}
                    placeholder={t("namePlaceholder")}
                    disabled={isSubmitting}
                    className={`w-full ps-4 pe-4 py-3 rounded-xl border transition-all text-sm ${
                      errors.fullName
                        ? "border-[var(--brand-danger)]/50 bg-[var(--brand-danger)]/5 focus:border-[var(--brand-danger)] focus:ring-[var(--brand-danger)]/20"
                        : "border-[var(--brand-border)] bg-[var(--brand-background)] focus:bg-[var(--brand-surface)] focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]/20"
                    } focus:outline-none focus:ring-2 text-[var(--brand-background-fg)] placeholder:text-[var(--brand-background-fg-muted)]`}
                  />
                  {errors.fullName && (
                    <p className="text-[var(--brand-danger)] text-xs mt-1.5 font-medium">{errors.fullName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-wider mb-2">
                    {t("fieldEmail")}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: "" });
                    }}
                    placeholder={t("emailPlaceholder")}
                    disabled={isSubmitting}
                    className={`w-full ps-4 pe-4 py-3 rounded-xl border transition-all text-sm ${
                      errors.email
                        ? "border-[var(--brand-danger)]/50 bg-[var(--brand-danger)]/5 focus:border-[var(--brand-danger)] focus:ring-[var(--brand-danger)]/20"
                        : "border-[var(--brand-border)] bg-[var(--brand-background)] focus:bg-[var(--brand-surface)] focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]/20"
                    } focus:outline-none focus:ring-2 text-[var(--brand-background-fg)] placeholder:text-[var(--brand-background-fg-muted)]`}
                  />
                  {errors.email && (
                    <p className="text-[var(--brand-danger)] text-xs mt-1.5 font-medium">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-wider mb-2">
                    {t("fieldRole")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setRole("staff")}
                      className={`py-3 ps-4 pe-4 rounded-xl border text-sm font-bold transition-all ${
                        role === "staff"
                          ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                          : "border-[var(--brand-border)] bg-[var(--brand-background)] text-[var(--brand-background-fg-muted)] hover:bg-[var(--brand-background-active)]"
                      }`}
                    >
                      {t("roleStaff")}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setRole("finance");
                      }}
                      className={`py-3 ps-4 pe-4 rounded-xl border text-sm font-bold transition-all ${
                        role === "finance"
                          ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                          : "border-[var(--brand-border)] bg-[var(--brand-background)] text-[var(--brand-background-fg-muted)] hover:bg-[var(--brand-background-active)]"
                      }`}
                    >
                      {t("roleFinance")}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-wider mb-2">
                    {t("fieldBranch")}
                  </label>
                  <select
                    value={branchId}
                    onChange={(e) => {
                      setBranchId(e.target.value);
                      if (errors.branchId) setErrors({ ...errors, branchId: "" });
                    }}
                    disabled={isSubmitting}
                    className={`w-full ps-4 pe-4 py-3 rounded-xl border transition-all text-sm appearance-none ${
                      errors.branchId
                        ? "border-[var(--brand-danger)]/50 bg-[var(--brand-danger)]/5 focus:border-[var(--brand-danger)] focus:ring-[var(--brand-danger)]/20"
                        : "border-[var(--brand-border)] bg-[var(--brand-background)] focus:bg-[var(--brand-surface)] focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]/20"
                    } focus:outline-none focus:ring-2 text-[var(--brand-background-fg)]`}
                  >
                    <option value="" disabled>{t("branchPlaceholder")}</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                  {errors.branchId && (
                    <p className="text-[var(--brand-danger)] text-xs mt-1.5 font-medium">{errors.branchId}</p>
                  )}
                </div>
              </div>

              <div className="ps-6 pe-6 py-4 bg-[var(--brand-background)]/50 flex justify-end gap-3 border-t border-[var(--brand-border)]">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="ps-4 pe-4 py-2 text-sm font-bold text-[var(--brand-background-fg-muted)] hover:text-[var(--brand-background-fg)] transition-colors disabled:opacity-50"
                >
                  {t("btnCancel")}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="ps-6 pe-6 py-2 bg-[var(--brand-primary)] hover:opacity-90 text-[var(--brand-primary-fg)] rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-[var(--brand-primary)]/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {t("submitting")}
                    </>
                  ) : (
                    isEdit ? t("btnUpdate") : t("btnCreate")
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
