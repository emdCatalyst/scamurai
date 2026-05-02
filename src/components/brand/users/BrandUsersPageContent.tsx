"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, Info } from "lucide-react";
import { BrandUserRow } from "@/lib/queries/brandUsers";
import BrandUsersFilterBar from "./BrandUsersFilterBar";
import BrandUsersTable from "./BrandUsersTable";
import BrandUserDetailDrawer from "./BrandUserDetailDrawer";
import BrandUserFormModal from "./BrandUserFormModal";
import DisableBrandUserModal from "./DisableBrandUserModal";
import DeleteBrandUserModal from "./DeleteBrandUserModal";
import ResetPasswordModal from "./ResetPasswordModal";
import PlanLimitBanner from "./PlanLimitBanner";
import BranchesPagination from "@/components/brand/branches/BranchesPagination"; // Reusing pagination component

interface BrandUsersPageContentProps {
  initialData: BrandUserRow[];
  totalCount: number;
  tabCounts: {
    all: number;
    finance: number;
    staff: number;
  };
  userCount: number;
  limit: number;
  currentPage: number;
  locale: string;
  branches: { id: string; name: string }[];
}

export default function BrandUsersPageContent({
  initialData,
  totalCount,
  tabCounts,
  userCount,
  limit,
  currentPage,
  locale,
  branches,
}: BrandUsersPageContentProps) {
  const t = useTranslations("brand.users");
  const [selectedUser, setSelectedUser] = useState<BrandUserRow | null>(null);
  const [editingUser, setEditingUser] = useState<BrandUserRow | null>(null);
  const [deletingUser, setDeletingUser] = useState<BrandUserRow | null>(null);
  const [disablingUser, setDisablingUser] = useState<BrandUserRow | null>(null);
  const [resettingUser, setResettingUser] = useState<BrandUserRow | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const isAtLimit = userCount >= limit;

  return (
    <div className="space-y-6">
      {isAtLimit && <PlanLimitBanner limit={limit} />}

      {/* Header Info & Actions */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-[var(--brand-surface)]/50 backdrop-blur-sm border border-[var(--brand-border)] px-4 py-2 rounded-2xl shadow-sm flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--brand-surface-fg-muted)]">
              {t("usage", { count: userCount, limit })}
            </span>
            <div className="w-24 h-2 bg-[var(--brand-surface-fg)]/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isAtLimit ? "bg-[var(--brand-danger)]" : "bg-[var(--brand-primary)]"
                }`}
                style={{ width: `${Math.min((userCount / limit) * 100, 100)}%` }}
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
          {t("addMember")}
        </button>
      </div>

      <BrandUsersFilterBar
        tabCounts={tabCounts}
        branches={branches}
        locale={locale}
      />

      <BrandUsersTable
        users={initialData}
        onDetailOpen={setSelectedUser}
        onEditOpen={setEditingUser}
        onDeleteOpen={setDeletingUser}
        onDisableOpen={setDisablingUser}
        onResetPasswordOpen={setResettingUser}
      />

      <BranchesPagination
        total={totalCount}
        pageSize={20}
        currentPage={currentPage}
        locale={locale}
      />

      <BrandUserDetailDrawer
        user={selectedUser || initialData[0]}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onEdit={() => {
          setEditingUser(selectedUser);
          setSelectedUser(null);
        }}
        onDelete={() => {
          setDeletingUser(selectedUser);
          setSelectedUser(null);
        }}
        onDisable={() => {
          setDisablingUser(selectedUser);
          setSelectedUser(null);
        }}
        onResetPassword={() => {
          setResettingUser(selectedUser);
          setSelectedUser(null);
        }}
      />

      <BrandUserFormModal
        isOpen={isCreateModalOpen || !!editingUser}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingUser(null);
        }}
        user={editingUser || undefined}
        branches={branches}
      />

      <DisableBrandUserModal
        isOpen={!!disablingUser}
        onClose={() => setDisablingUser(null)}
        user={disablingUser || initialData[0]}
      />

      <DeleteBrandUserModal
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        user={deletingUser || initialData[0]}
      />

      <ResetPasswordModal
        isOpen={!!resettingUser}
        onClose={() => setResettingUser(null)}
        user={resettingUser || initialData[0]}
      />
    </div>
  );
}
