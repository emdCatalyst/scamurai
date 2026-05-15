"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Building2, Users, Settings2, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { BrandRow as BrandRowType } from "@/lib/queries/brands";
import { setBrandLimits } from "@/actions/setBrandLimits";
import { useToast } from "@/components/ui/Toast";
import { PLANS, type PlanKey } from "@/config/plans";

interface BrandLimitsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  brand: BrandRowType;
}

export default function BrandLimitsDialog({
  isOpen,
  onClose,
  brand,
}: BrandLimitsDialogProps) {
  const t = useTranslations("admin.brands.limits");
  const tCommon = useTranslations("common.dialog");
  const { toast } = useToast();

  const [plan, setPlan] = useState<PlanKey>(brand.plan as PlanKey);
  // `null` = use plan default; number = custom override.
  const [customBranches, setCustomBranches] = useState<number | null>(
    brand.customMaxBranches
  );
  const [customUsers, setCustomUsers] = useState<number | null>(
    brand.customMaxUsers
  );
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset local state whenever a different brand is opened.
  useEffect(() => {
    if (isOpen) {
      setPlan(brand.plan as PlanKey);
      setCustomBranches(brand.customMaxBranches);
      setCustomUsers(brand.customMaxUsers);
    }
  }, [isOpen, brand]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const planConfig = PLANS[plan] ?? PLANS.starter;
  const effectiveBranchLimit = customBranches ?? planConfig.max_branches;
  const effectiveUserLimit = customUsers ?? planConfig.max_users;
  const branchLimitBelowUsage = effectiveBranchLimit < brand.branchCount;
  const userLimitBelowUsage = effectiveUserLimit < brand.userCount;
  const isInvalid = branchLimitBelowUsage || userLimitBelowUsage;

  const handleSave = async () => {
    setIsSaving(true);
    const result = await setBrandLimits({
      brandId: brand.id,
      plan,
      customMaxBranches: customBranches,
      customMaxUsers: customUsers,
    });
    setIsSaving(false);

    if (result.success) {
      toast(t("saved"), "success");
      onClose();
    } else {
      toast(result.error || t("error"), "error");
    }
  };

  if (!mounted) return null;

  return createPortal(
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
            onClick={() => !isSaving && onClose()}
            className={`absolute inset-0 bg-[#0A1628]/40 backdrop-blur-sm ${
              !isSaving ? "cursor-pointer" : "cursor-wait"
            }`}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
          >
            {/* Header */}
            <div className="px-8 pt-8 pb-4 flex items-start gap-5">
              <div className="w-14 h-14 rounded-2xl bg-sky/10 text-sky flex items-center justify-center shrink-0">
                <Settings2 size={28} />
              </div>
              <div className="flex-1 pt-1 min-w-0">
                <h3 className="text-xl font-bold text-slate-800 leading-tight truncate">
                  {t("title")}
                </h3>
                <p className="text-slate-500 text-sm mt-1 truncate">
                  {brand.name}
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={isSaving}
                className="p-1 -mt-1 -me-1 text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-30"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="px-8 pb-6 space-y-6">
              {/* Plan selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  {t("plan")}
                </label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as PlanKey)}
                  disabled={isSaving}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:border-sky/50 focus:ring-1 focus:ring-sky/50 disabled:opacity-50"
                >
                  {(Object.keys(PLANS) as PlanKey[]).map((key) => (
                    <option key={key} value={key}>
                      {PLANS[key].label} — {PLANS[key].max_branches}{" "}
                      {t("branchesLabel")} / {PLANS[key].max_users}{" "}
                      {t("usersLabel")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Branches limit */}
              <LimitField
                icon={<Building2 size={16} />}
                title={t("branches")}
                current={brand.branchCount}
                planDefault={planConfig.max_branches}
                value={customBranches}
                onChange={setCustomBranches}
                effective={effectiveBranchLimit}
                belowUsage={branchLimitBelowUsage}
                disabled={isSaving}
                resetLabel={t("useDefault")}
                currentLabel={t("inUse")}
                planDefaultLabel={t("planDefault")}
                belowUsageError={t("belowUsage")}
              />

              {/* Users limit */}
              <LimitField
                icon={<Users size={16} />}
                title={t("users")}
                current={brand.userCount}
                planDefault={planConfig.max_users}
                value={customUsers}
                onChange={setCustomUsers}
                effective={effectiveUserLimit}
                belowUsage={userLimitBelowUsage}
                disabled={isSaving}
                resetLabel={t("useDefault")}
                currentLabel={t("inUse")}
                planDefaultLabel={t("planDefault")}
                belowUsageError={t("belowUsage")}
              />
            </div>

            {/* Footer */}
            <div className="px-8 py-5 flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={onClose}
                disabled={isSaving}
                className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50 rounded-xl"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || isInvalid}
                className="px-8 py-2.5 rounded-xl text-sm font-bold bg-navy text-white shadow-lg transition-all disabled:opacity-50"
              >
                {isSaving ? tCommon("loading") : t("save")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

interface LimitFieldProps {
  icon: React.ReactNode;
  title: string;
  current: number;
  planDefault: number;
  value: number | null;
  onChange: (v: number | null) => void;
  effective: number;
  belowUsage: boolean;
  disabled: boolean;
  resetLabel: string;
  currentLabel: string;
  planDefaultLabel: string;
  belowUsageError: string;
}

function LimitField({
  icon,
  title,
  current,
  planDefault,
  value,
  onChange,
  effective,
  belowUsage,
  disabled,
  resetLabel,
  currentLabel,
  planDefaultLabel,
  belowUsageError,
}: LimitFieldProps) {
  const isCustom = value !== null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-slate-500">{icon}</span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {title}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
        <span>
          {currentLabel}:{" "}
          <span className="font-bold text-slate-800">{current}</span>
        </span>
        <span className="text-slate-300">•</span>
        <span>
          {planDefaultLabel}:{" "}
          <span className="font-bold text-slate-800">{planDefault}</span>
        </span>
      </div>
      <div className="flex items-stretch gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={isCustom ? value : planDefault}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange(null);
              return;
            }
            const n = Number(raw);
            if (Number.isFinite(n) && n > 0) onChange(n);
          }}
          disabled={disabled}
          className={`flex-1 bg-white border rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-1 disabled:opacity-50 ${
            belowUsage
              ? "border-red-300 text-red-600 focus:border-red-400 focus:ring-red-300"
              : isCustom
                ? "border-sky/40 text-slate-800 focus:border-sky focus:ring-sky/50"
                : "border-slate-200 text-slate-500 focus:border-sky/50 focus:ring-sky/50"
          }`}
        />
        {isCustom && (
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            title={resetLabel}
            className="px-3 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-colors disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium"
          >
            <RotateCcw size={14} />
            {resetLabel}
          </button>
        )}
      </div>
      <div className="mt-1.5 text-[11px] flex items-center justify-between">
        <span className="text-slate-400">
          → <span className="font-bold text-slate-700">{effective}</span>
        </span>
        {belowUsage && (
          <span className="text-red-500 font-medium">{belowUsageError}</span>
        )}
      </div>
    </div>
  );
}
