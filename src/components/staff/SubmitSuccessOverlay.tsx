"use client";

import { useEffect, useId, useRef } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface SubmitSuccessOverlayProps {
  isVisible: boolean;
  orderNumber?: string;
  /**
   * Why the phone couldn't save the order. This page keeps it and uploads
   * it, so the worker must keep the page open: said until they tap OK.
   */
  problem?: string;
  /** Orders only this page holds. */
  unsaved?: number;
  onDismiss: () => void;
}

/**
 * The order is saved: on the phone, and uploading in the background. CSS
 * animation only, to keep the staff screen light. A tap skips the wait.
 */
export default function SubmitSuccessOverlay({ isVisible, orderNumber, problem, unsaved = 0, onDismiss }: SubmitSuccessOverlayProps) {
  const t = useTranslations("brand.submit");
  const okButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const detailId = useId();

  useEffect(() => {
    if (isVisible && problem) okButton.current?.focus();
  }, [isVisible, problem]);

  if (!isVisible) return null;

  if (problem) {
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={detailId}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-[var(--brand-background)] p-6 text-center text-[var(--brand-background-fg)] animate-[fade-in_150ms_ease-out]"
      >
        <AlertTriangle className="h-16 w-16 text-[#f59e0b]" aria-hidden />
        <h2 id={titleId} className="text-xl font-bold">{problem}</h2>
        <p id={detailId} className="text-[var(--brand-background-fg-muted)]">
          {t("unsavedOrders", { count: Math.max(unsaved, 1) })}
        </p>
        <button
          ref={okButton}
          type="button"
          onClick={onDismiss}
          className="min-h-12 w-full max-w-xs rounded-xl bg-[var(--brand-primary)] text-lg font-bold text-[var(--brand-primary-fg)]"
        >
          {t("gotIt")}
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={onDismiss}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--brand-background)] text-[var(--brand-background-fg)] p-6 text-center animate-[fade-in_150ms_ease-out]"
    >
      <CheckCircle2 className="h-24 w-24 text-mint mb-4 animate-[pop-in_250ms_ease-out]" aria-hidden />
      <h2 className="text-2xl font-bold mb-2">{t("orderSaved")}</h2>
      {orderNumber && (
        <p className="text-[var(--brand-background-fg-muted)] tabular-nums mb-4">
          {t("reference")}: {orderNumber}
        </p>
      )}
      <p className="text-sm text-[var(--brand-background-fg-muted)]">{t("uploadsInBackground")}</p>
    </div>
  );
}
