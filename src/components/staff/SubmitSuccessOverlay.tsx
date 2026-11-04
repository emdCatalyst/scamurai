"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface SubmitSuccessOverlayProps {
  isVisible: boolean;
  orderNumber?: string;
}

/**
 * A brief "saved" confirmation: the order is on the phone and uploads in the
 * background. CSS animation only, to keep the staff screen light.
 */
export default function SubmitSuccessOverlay({ isVisible, orderNumber }: SubmitSuccessOverlayProps) {
  const t = useTranslations("brand.submit");
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--brand-background)]/95 text-[var(--brand-background-fg)] p-6 text-center animate-[fade-in_150ms_ease-out]">
      <CheckCircle2 className="h-24 w-24 text-mint mb-4 animate-[pop-in_250ms_ease-out]" />
      <h2 className="text-2xl font-bold mb-2">{t("orderSaved")}</h2>
      {orderNumber && (
        <p className="text-[var(--brand-background-fg-muted)] font-mono mb-4">
          {t("reference")}: {orderNumber}
        </p>
      )}
      <p className="text-sm text-[var(--brand-background-fg-muted)]">{t("uploadsInBackground")}</p>
    </div>
  );
}
