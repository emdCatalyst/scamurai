"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Info } from "lucide-react";
import { BranchRow } from "@/lib/queries/branches";
import BranchesFilterBar from "./BranchesFilterBar";
import BranchesTable from "./BranchesTable";
import BranchesPagination from "./BranchesPagination";
import BranchDetailDrawer from "./BranchDetailDrawer";
import BranchFormModal from "./BranchFormModal";
import DeleteBranchModal from "./DeleteBranchModal";
import DisableBranchModal from "./DisableBranchModal";

interface BranchesPageContentProps {
  brandId: string;
  initialData: BranchRow[];
  totalCount: number;
  tabCounts: {
    all: number;
    active: number;
    inactive: number;
  };
  branchCount: number;
  limit: number;
  currentPage: number;
  locale: string;
}

export default function BranchesPageContent({
  brandId,
  initialData,
  totalCount,
  tabCounts,
  branchCount,
  limit,
  currentPage,
  locale,
}: BranchesPageContentProps) {
  const t = useTranslations("brand.branches");
  const [selectedBranch, setSelectedBranch] = useState<BranchRow | null>(null);
  const [editingBranch, setEditingBranch] = useState<BranchRow | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<BranchRow | null>(null);
  const [disablingBranch, setDisablingBranch] = useState<BranchRow | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const isAtLimit = branchCount >= limit;

  return (
    <div className="space-y-6">
      {/* Header Info & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-[var(--brand-surface)]/50 backdrop-blur-sm border border-[var(--brand-border)] px-4 py-2 rounded-2xl shadow-sm flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--brand-surface-fg-muted)]">
              {t("usage", { active: branchCount, limit })}
            </span>
            <div className="w-24 h-2 bg-[var(--brand-surface-fg)]/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isAtLimit ? "bg-[var(--brand-danger)]" : "bg-[var(--brand-primary)]"
                }`}
                style={{ width: `${Math.min((branchCount / limit) * 100, 100)}%` }}
              />
            </div>
            {isAtLimit && (
              <div className="group relative">
                <Info size={14} className="text-[var(--brand-danger)] cursor-help" />
                <div className="absolute bottom-full mb-2 start-1/2 -translate-x-1/2 w-48 p-2 bg-[var(--brand-background)] text-[var(--brand-background-fg)] text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl border border-[var(--brand-border)]">
                  {t("planLimitReached")}
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          disabled={isAtLimit}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all duration-300 shadow-lg ${
            isAtLimit
              ? "bg-[var(--brand-surface-fg)]/10 text-[var(--brand-surface-fg-muted)] cursor-not-allowed grayscale"
              : "bg-[var(--brand-primary)] text-[var(--brand-primary-fg)] hover:scale-105 active:scale-95"
          }`}
          style={!isAtLimit ? { boxShadow: `0 10px 15px -3px var(--brand-primary), 0 4px 6px -4px var(--brand-primary)` } : {}}
        >
          <Plus size={18} strokeWidth={2.5} />
          {t("addBranch")}
        </button>
      </div>

      <BranchesFilterBar
        tabCounts={tabCounts}
        locale={locale}
      />

      <BranchesTable
        branches={initialData}
        onDetailOpen={setSelectedBranch}
        onEditOpen={setEditingBranch}
        onDeleteOpen={setDeletingBranch}
        onDisableOpen={setDisablingBranch}
      />

      <BranchesPagination
        total={totalCount}
        pageSize={20}
        currentPage={currentPage}
        locale={locale}
      />

      <BranchDetailDrawer
        branch={selectedBranch || initialData[0]} // Provide fallback to avoid crash if selectedBranch is null
        isOpen={!!selectedBranch}
        onClose={() => setSelectedBranch(null)}
        onEdit={() => {
          setEditingBranch(selectedBranch);
          setSelectedBranch(null);
        }}
        onDelete={() => {
          setDeletingBranch(selectedBranch);
          setSelectedBranch(null);
        }}
        onDisable={() => {
          setDisablingBranch(selectedBranch);
          setSelectedBranch(null);
        }}
      />

      <BranchFormModal
        isOpen={isCreateModalOpen || !!editingBranch}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingBranch(null);
        }}
        brandId={brandId}
        branch={editingBranch || undefined}
      />

      <DeleteBranchModal
        isOpen={!!deletingBranch}
        onClose={() => setDeletingBranch(null)}
        branch={deletingBranch || initialData[0]} // Provide fallback
      />

      <DisableBranchModal
        isOpen={!!disablingBranch}
        onClose={() => setDisablingBranch(null)}
        branch={disablingBranch || initialData[0]} // Provide fallback
      />
    </div>
  );
}
