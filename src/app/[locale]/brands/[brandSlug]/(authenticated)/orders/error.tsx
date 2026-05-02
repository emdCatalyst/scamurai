"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

export default function OrdersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("brand.orders");

  useEffect(() => {
    console.error("[Orders page] error:", error);
  }, [error]);

  return (
    <div className="bg-[var(--brand-surface)]/50 backdrop-blur-md rounded-3xl border border-dashed border-[var(--brand-border)] py-20 flex flex-col items-center justify-center text-center px-4">
      <div className="w-20 h-20 bg-[var(--brand-danger)]/10 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle size={32} className="text-[var(--brand-danger)]" />
      </div>
      <p className="text-[var(--brand-surface-fg)] mb-6">{t("loadError")}</p>
      <button
        onClick={reset}
        className="px-5 py-2 rounded-xl text-sm font-bold bg-[var(--brand-primary)] text-[var(--brand-primary-fg)] hover:scale-105 transition-transform"
      >
        Retry
      </button>
    </div>
  );
}
