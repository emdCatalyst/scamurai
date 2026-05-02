"use client";

import { useTranslations } from "next-intl";
import { BrandUserRow as BrandUserRowType } from "@/lib/queries/brandUsers";
import BrandUserRow from "./BrandUserRow";

interface BrandUsersTableProps {
  users: BrandUserRowType[];
  onDetailOpen: (user: BrandUserRowType) => void;
  onEditOpen: (user: BrandUserRowType) => void;
  onDeleteOpen: (user: BrandUserRowType) => void;
  onDisableOpen: (user: BrandUserRowType) => void;
  onResetPasswordOpen: (user: BrandUserRowType) => void;
}

export default function BrandUsersTable({
  users,
  onDetailOpen,
  onEditOpen,
  onDeleteOpen,
  onDisableOpen,
  onResetPasswordOpen,
}: BrandUsersTableProps) {
  const t = useTranslations("brand.users.table");

  if (users.length === 0) {
    return (
      <div className="bg-[var(--brand-surface)]/50 backdrop-blur-md rounded-3xl border border-dashed border-[var(--brand-border)] py-20 flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 bg-[var(--brand-surface-fg)]/5 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-[var(--brand-surface-fg-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
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
              <th className="text-start ps-6 pe-6 py-5 text-xs font-bold text-[var(--brand-background-fg-muted)] uppercase tracking-wider">
                {t("member")}
              </th>
              <th className="text-start ps-6 pe-6 py-5 text-xs font-bold text-[var(--brand-background-fg-muted)] uppercase tracking-wider">
                {t("role")}
              </th>
              <th className="text-start ps-6 pe-6 py-5 text-xs font-bold text-[var(--brand-background-fg-muted)] uppercase tracking-wider">
                {t("branch")}
              </th>
              <th className="text-start ps-6 pe-6 py-5 text-xs font-bold text-[var(--brand-background-fg-muted)] uppercase tracking-wider">
                {t("status")}
              </th>
              <th className="text-start ps-6 pe-6 py-5 text-xs font-bold text-[var(--brand-background-fg-muted)] uppercase tracking-wider">
                {t("password")}
              </th>
              <th className="text-start ps-6 pe-6 py-5 text-xs font-bold text-[var(--brand-background-fg-muted)] uppercase tracking-wider">
                {t("joined")}
              </th>
              <th className="text-end ps-6 pe-6 py-5 text-xs font-bold text-[var(--brand-background-fg-muted)] uppercase tracking-wider">
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--brand-border)]">
            {users.map((user) => (
              <BrandUserRow
                key={user.id}
                user={user}
                onClick={() => onDetailOpen(user)}
                onEdit={() => onEditOpen(user)}
                onDelete={() => onDeleteOpen(user)}
                onDisable={() => onDisableOpen(user)}
                onResetPassword={() => onResetPasswordOpen(user)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
