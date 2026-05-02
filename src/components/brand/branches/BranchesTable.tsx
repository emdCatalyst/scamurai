"use client";

import { useTranslations } from "next-intl";
import { BranchRow as BranchRowType } from "@/lib/queries/branches";
import BranchRow from "./BranchRow";

interface BranchesTableProps {
  branches: BranchRowType[];
  onDetailOpen: (branch: BranchRowType) => void;
  onEditOpen: (branch: BranchRowType) => void;
  onDeleteOpen: (branch: BranchRowType) => void;
  onDisableOpen: (branch: BranchRowType) => void;
}

export default function BranchesTable({
  branches,
  onDetailOpen,
  onEditOpen,
  onDeleteOpen,
  onDisableOpen,
}: BranchesTableProps) {
  const t = useTranslations("brand.branches.table");

  if (branches.length === 0) {
    return (
      <div className="bg-[var(--brand-surface)]/50 backdrop-blur-md rounded-3xl border border-dashed border-[var(--brand-border)] py-20 flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 bg-[var(--brand-surface-fg)]/5 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-[var(--brand-surface-fg-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-[var(--brand-surface-fg)] mb-2">{t("emptyTitle")}</h3>
        <p className="text-[var(--brand-surface-fg-muted)] max-w-xs">{t("emptyDesc")}</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--brand-surface)]/50 backdrop-blur-md rounded-3xl border border-[var(--brand-border)] overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-start border-collapse">
          <thead>
            <tr className="border-b border-[var(--brand-border)]">
              <th className="text-start px-6 py-5 text-xs font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-wider">
                {t("name")}
              </th>
              <th className="text-start px-6 py-5 text-xs font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-wider">
                {t("status")}
              </th>
              <th className="text-start px-6 py-5 text-xs font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-wider">
                {t("staff")}
              </th>
              <th className="text-start px-6 py-5 text-xs font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-wider">
                {t("orders")}
              </th>
              <th className="text-start px-6 py-5 text-xs font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-wider">
                {t("created")}
              </th>
              <th className="text-end px-6 py-5 text-xs font-bold text-[var(--brand-surface-fg-muted)] uppercase tracking-wider">
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--brand-border)]">
            {branches.map((branch) => (
              <BranchRow
              key={branch.id}
              branch={branch}
              onClick={() => onDetailOpen(branch)}
              onEdit={() => onEditOpen(branch)}
              onDelete={() => onDeleteOpen(branch)}
              onDisable={() => onDisableOpen(branch)}
              />            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
