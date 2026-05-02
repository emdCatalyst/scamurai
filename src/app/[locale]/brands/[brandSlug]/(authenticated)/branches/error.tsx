"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function BranchesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common.error");

  useEffect(() => {
    console.error("[brand/branches] error:", error);
  }, [error]);

  return (
    <div className="bg-[var(--brand-surface)]/50 backdrop-blur-md rounded-3xl border border-dashed border-[var(--brand-border)] py-20 flex flex-col items-center justify-center text-center px-4">
      <div className="w-20 h-20 bg-[var(--brand-danger)]/10 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle size={32} className="text-[var(--brand-danger)]" strokeWidth={1.5} />
      </div>
      <h2 className="text-xl font-bold text-[var(--brand-surface-fg)] mb-2">{t("title")}</h2>
      <p className="text-[var(--brand-surface-fg-muted)] max-w-md mb-6">{t("message")}</p>
      <button
        onClick={() => reset()}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[var(--brand-primary)] text-[var(--brand-primary-fg)] hover:scale-105 transition-transform"
      >
        <RefreshCcw size={16} strokeWidth={2} />
        {t("retry")}
      </button>
    </div>
  );
}
