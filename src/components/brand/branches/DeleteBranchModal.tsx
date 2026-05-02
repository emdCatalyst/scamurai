"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { X, Loader2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BranchRow } from "@/lib/queries/branches";
import { getBranchDeletionConflicts } from "@/actions/brand/getBranchDeletionConflicts";
import { deleteBranch, StaffResolution } from "@/actions/brand/deleteBranch";
import { useToast } from "@/components/ui/Toast";
import StaffResolutionRow from "./StaffResolutionRow";

interface DeleteBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  branch: BranchRow;
}

export default function DeleteBranchModal({
  isOpen,
  onClose,
  branch,
}: DeleteBranchModalProps) {
  const t = useTranslations("brand.branches.delete");
  const tActions = useTranslations("brand.branches.actions");
  const { toast } = useToast();
  
  const [phase, setPhase] = useState<1 | 2>(1);
  const [isLoadingConflicts, setIsLoadingConflicts] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [assignedStaff, setAssignedStaff] = useState<{ id: string; fullName: string; email: string }[]>([]);
  const [otherBranches, setOtherBranches] = useState<{ id: string; name: string }[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, StaffResolution>>({});

  useEffect(() => {
    let isMounted = true;

    if (isOpen && branch?.id) {
      setTimeout(() => {
        if (!isMounted) return;
        setPhase(1);
        setIsLoadingConflicts(true);
        setResolutions({});
      }, 0);
      
      getBranchDeletionConflicts(branch.id).then((res) => {
        if (!isMounted) return;

        if (res.success) {
          setAssignedStaff(res.assignedStaff || []);
          setOtherBranches(res.otherBranches || []);
          if (res.assignedStaff && res.assignedStaff.length > 0) {
            setPhase(2);
          }
        } else {
          toast(res.error || "Failed to check conflicts", "error");
          onClose();
        }
        setIsLoadingConflicts(false);
      });
    }

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, branch?.id]);

  const handleResolutionChange = (staffId: string, resolution: StaffResolution) => {
    setResolutions((prev) => ({ ...prev, [staffId]: resolution }));
  };

  const isAllResolved = assignedStaff.every((s) => resolutions[s.id]);

  const handleDelete = async () => {
    if (phase === 2 && !isAllResolved) {
      toast(t("errorConflict"), "error");
      return;
    }

    if (!branch?.id) return;

    setIsDeleting(true);
    try {
      const res = await deleteBranch({
        branchId: branch.id,
        staffResolutions: Object.values(resolutions),
      });

      if (res.success) {
        toast(tActions("successDeleted"), "success");
        onClose();
      } else {
        toast(res.error || tActions("error"), "error");
      }
    } catch {
      toast(tActions("error"), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const canClose = !isLoadingConflicts && !isDeleting;

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
            onClick={() => canClose && onClose()}
            className={`absolute inset-0 bg-black/40 backdrop-blur-sm ${canClose ? "cursor-pointer" : "cursor-wait"}`}
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
            className={`relative w-full bg-[var(--brand-surface)] rounded-3xl shadow-2xl overflow-hidden ${
              phase === 2 ? "max-w-2xl" : "max-w-md"
            }`}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--brand-border)] flex items-center justify-between bg-[var(--brand-surface-fg-muted)]/5">
              <h3 className="text-lg font-bold text-[var(--brand-surface-fg)]">
                {phase === 1 ? t("simpleTitle") : t("conflictTitle")}
              </h3>
              <button
                onClick={onClose}
                disabled={!canClose}
                className="p-2 -me-2 text-[var(--brand-surface-fg-muted)] hover:text-[var(--brand-surface-fg)] transition-colors disabled:opacity-30 disabled:cursor-wait"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {isLoadingConflicts ? (
                <div className="py-10 flex flex-col items-center justify-center gap-3">
                  <Loader2 size={32} className="animate-spin text-[var(--brand-primary)]" />
                  <p className="text-sm font-medium text-[var(--brand-surface-fg-muted)]">{t("checkingConflicts")}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Warning Box */}
                  <div className="flex gap-4 p-4 bg-[var(--brand-danger)]/10 border border-[var(--brand-danger)]/20 rounded-2xl">
                    <div className="w-10 h-10 rounded-xl bg-[var(--brand-danger)]/20 flex items-center justify-center text-[var(--brand-danger)] shrink-0">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--brand-danger)] text-sm">
                        {phase === 1 ? t("simpleTitle") : t("conflictTitle")}
                      </h4>
                      <p className="text-[var(--brand-danger)]/80 text-xs mt-0.5 leading-relaxed">
                        {phase === 1
                          ? t("simpleDesc", { name: branch?.name || "" })
                          : t("conflictDesc", { count: assignedStaff.length })}
                      </p>
                    </div>
                  </div>

                  {/* Phase 2: Staff List */}
                  {phase === 2 && (
                    <div className="space-y-3 max-h-[40vh] overflow-y-auto custom-scrollbar pe-2">
                      {assignedStaff.map((staff) => (
                        <StaffResolutionRow
                          key={staff.id}
                          staff={staff}
                          otherBranches={otherBranches}
                          resolution={resolutions[staff.id]}
                          onChange={(res) => handleResolutionChange(staff.id, res)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-[var(--brand-surface-fg-muted)]/5 flex justify-end gap-3 border-t border-[var(--brand-border)]">
              <button
                onClick={onClose}
                disabled={!canClose}
                className="px-4 py-2 text-sm font-bold text-[var(--brand-surface-fg-muted)] hover:text-[var(--brand-surface-fg)] transition-colors disabled:opacity-50"
              >
                {t("btnCancel")}
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting || isLoadingConflicts || (phase === 2 && !isAllResolved)}
                className="px-6 py-2 bg-[var(--brand-danger)] text-[var(--brand-danger-fg)] rounded-xl text-sm font-bold hover:brightness-95 transition-all shadow-lg shadow-[var(--brand-danger)]/20 disabled:opacity-50 flex items-center gap-2"
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
