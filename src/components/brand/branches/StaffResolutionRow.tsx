"use client";

import { useTranslations } from "next-intl";
import { User, ChevronDown } from "lucide-react";
import { StaffResolution } from "@/actions/brand/deleteBranch";

interface StaffResolutionRowProps {
  staff: { id: string; fullName: string; email: string };
  otherBranches: { id: string; name: string }[];
  resolution?: StaffResolution;
  onChange: (res: StaffResolution) => void;
}

export default function StaffResolutionRow({
  staff,
  otherBranches,
  resolution,
  onChange,
}: StaffResolutionRowProps) {
  const t = useTranslations("brand.branches.delete");

  return (
    <div className="p-4 bg-[var(--brand-surface-fg-muted)]/5 border border-[var(--brand-border)] rounded-2xl space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[var(--brand-surface)] border border-[var(--brand-border)] flex items-center justify-center text-[var(--brand-surface-fg-muted)] shrink-0">
          <User size={20} />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-[var(--brand-surface-fg)] text-sm truncate">{staff.fullName}</p>
          <p className="text-[var(--brand-surface-fg-muted)] text-[10px] truncate">{staff.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Reassign Option */}
        <label
          className={`relative flex flex-col p-3 rounded-xl border-2 transition-all cursor-pointer ${
            resolution?.resolution === "reassign"
              ? "bg-[var(--brand-primary)]/5 border-[var(--brand-primary)]"
              : "bg-[var(--brand-surface)] border-transparent hover:border-[var(--brand-border)]"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <input
              type="radio"
              name={`res-${staff.id}`}
              checked={resolution?.resolution === "reassign"}
              onChange={() =>
                onChange({
                  staffId: staff.id,
                  resolution: "reassign",
                  newBranchId: otherBranches[0]?.id,
                })
              }
              className="accent-[var(--brand-primary)]"
            />
            <span className="text-[10px] font-bold text-[var(--brand-surface-fg)]">
              {t("reassign")}
            </span>
          </div>

          <div className="relative">
            <select
              disabled={resolution?.resolution !== "reassign" || otherBranches.length === 0}
              value={resolution?.newBranchId || ""}
              onChange={(e) =>
                onChange({
                  staffId: staff.id,
                  resolution: "reassign",
                  newBranchId: e.target.value,
                })
              }
              className="w-full appearance-none bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-lg py-1.5 ps-3 pe-8 text-[11px] font-medium text-[var(--brand-surface-fg)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 disabled:opacity-50 cursor-pointer"
            >
              {otherBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
              {otherBranches.length === 0 && (
                <option value="">No other branches</option>
              )}
            </select>
            <ChevronDown
              className="absolute end-2 top-1/2 -translate-y-1/2 text-[var(--brand-surface-fg-muted)] pointer-events-none"
              size={12}
            />
          </div>
        </label>

        {/* Deactivate Option */}
        <label
          className={`relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
            resolution?.resolution === "deactivate"
              ? "bg-[var(--brand-danger)]/5 border-[var(--brand-danger)]"
              : "bg-[var(--brand-surface)] border-transparent hover:border-[var(--brand-border)]"
          }`}
        >
          <input
            type="radio"
            name={`res-${staff.id}`}
            checked={resolution?.resolution === "deactivate"}
            onChange={() =>
              onChange({ staffId: staff.id, resolution: "deactivate" })
            }
            className="accent-[var(--brand-danger)]"
          />
          <span className="text-[10px] font-bold text-[var(--brand-surface-fg)] leading-tight">
            {t("deactivate")}
          </span>
        </label>
      </div>
    </div>
  );
}
