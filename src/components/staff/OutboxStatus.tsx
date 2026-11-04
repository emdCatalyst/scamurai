"use client";

import { AlertCircle, CloudUpload, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { OutboxState } from "./useOutbox";

interface OutboxStatusProps extends OutboxState {
  onUploadNow: () => void;
  onRetryFailed: () => void;
}

/** What the phone still has to send. Hidden when everything has arrived. */
export default function OutboxStatus({ waiting, failed, uploading, onUploadNow, onRetryFailed }: OutboxStatusProps) {
  const t = useTranslations("brand.submit");
  if (waiting === 0 && failed.length === 0) return null;

  return (
    <div className="flex flex-col gap-2" role="status" aria-live="polite">
      {waiting > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <CloudUpload className={cn("h-5 w-5 shrink-0", uploading && "animate-pulse")} />
            {t("waitingUploads", { count: waiting })}
          </span>
          <button
            type="button"
            onClick={onUploadNow}
            disabled={uploading}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
          >
            <RefreshCw className={cn("h-4 w-4", uploading && "animate-spin")} />
            {uploading ? t("uploading") : t("uploadNow")}
          </button>
        </div>
      )}

      {failed.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--brand-danger)]/20 bg-[var(--brand-danger)]/10 px-4 py-3 text-[var(--brand-danger)]">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {t("failedUploads", { count: failed.length })}: {failed.map((order) => order.orderNumber).join("، ")}
          </span>
          <p className="text-xs">{t("failedHint")}</p>
          <button
            type="button"
            onClick={onRetryFailed}
            title={failed.map((order) => `${order.orderNumber}: ${order.lastError ?? ""}`).join("\n")}
            className="self-start rounded-lg border border-current px-3 py-1.5 text-xs font-bold"
          >
            {t("retryFailed")}
          </button>
        </div>
      )}
    </div>
  );
}
