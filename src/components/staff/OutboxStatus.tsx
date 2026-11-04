"use client";

import { useId, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, CloudUpload, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { failedReason, retryCanHelp } from "./orderForm";
import type { OutboxState } from "./useOutbox";

interface OutboxStatusProps extends OutboxState {
  /** Orders only this page holds: lost if it closes. */
  unsaved: number;
  wrongAccount: boolean;
  /** The phone's orders have been counted: "all sent" can be said. */
  checked: boolean;
  apps: { id: string; name: string }[];
  /** The refused order being corrected in the form. */
  editingId?: string;
  onUploadNow: () => void;
  onRetryFailed: () => void;
  onEdit: (id: string) => void;
  /** Resolves true once the order is gone (the worker may say no). */
  onRemove: (id: string) => Promise<boolean>;
}

type Tone = "quiet" | "waiting" | "danger";

const TONES: Record<Tone, string> = {
  quiet: "border-transparent text-[var(--brand-surface-fg-muted)]",
  // Hex, not Tailwind's oklch() palette, which Chrome before 111 and Safari before 15.4 can't read.
  waiting: "border-[#fde68a] bg-[#fffbeb] text-[#78350f]",
  danger: "border-[var(--brand-danger-line)] bg-[var(--brand-danger-soft)] text-[var(--brand-surface-fg)]",
};

/**
 * What the phone still has to send, in one row that is always there: it
 * sits above the photo tiles, and a row that came and went would move them
 * under the worker's finger. Refused orders are listed under it only once
 * the worker opens the list, each with its reason and a way out.
 */
export default function OutboxStatus({
  waiting,
  failed,
  uploading,
  unsaved,
  wrongAccount,
  checked,
  apps,
  editingId,
  onUploadNow,
  onRetryFailed,
  onEdit,
  onRemove,
}: OutboxStatusProps) {
  const t = useTranslations("brand.submit");
  const [listOpen, setListOpen] = useState(false);
  const listId = useId();
  const showList = listOpen && failed.length > 0;

  // The list closes once the worker has dealt with it, so a later refusal can't open it by itself.
  const edit = (id: string) => {
    setListOpen(false);
    onEdit(id);
  };
  const remove = async (id: string) => {
    if ((await onRemove(id)) && failed.length === 1) setListOpen(false);
  };
  const retry = () => {
    setListOpen(false);
    onRetryFailed();
  };

  const uploadNow = (
    <button
      type="button"
      onClick={onUploadNow}
      disabled={uploading}
      // Solid while uploading: faded, white on amber would be unreadable; the spinning icon says it's busy.
      className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg bg-[#b45309] px-3 text-sm font-bold text-white"
    >
      <RefreshCw className={cn("h-4 w-4", uploading && "animate-spin")} aria-hidden />
      {uploading ? t("uploading") : t("uploadNow")}
    </button>
  );

  let tone: Tone = "quiet";
  let icon: ReactNode = null;
  let text = "";
  let action: ReactNode = null;
  if (wrongAccount) {
    tone = "danger";
    icon = <AlertCircle className="h-5 w-5 shrink-0 text-[var(--brand-danger)]" aria-hidden />;
    text = t("wrongAccount");
  } else if (unsaved > 0) {
    tone = "danger";
    icon = <AlertCircle className="h-5 w-5 shrink-0 text-[var(--brand-danger)]" aria-hidden />;
    text = t("unsavedOrders", { count: unsaved });
    action = uploadNow;
  } else if (failed.length > 0) {
    tone = "danger";
    icon = <AlertCircle className="h-5 w-5 shrink-0 text-[var(--brand-danger)]" aria-hidden />;
    text = t("failedUploads", { count: failed.length });
    action = (
      <button
        type="button"
        onClick={() => setListOpen((open) => !open)}
        aria-expanded={showList}
        aria-controls={listId}
        className="flex min-h-11 shrink-0 items-center gap-1 rounded-lg border border-[var(--brand-danger)] bg-[var(--brand-surface)] px-3 text-sm font-bold text-[var(--brand-surface-fg)]"
      >
        {showList ? t("hideFailed") : t("showFailed")}
        <ChevronDown className={cn("h-4 w-4 transition-transform", showList && "rotate-180")} aria-hidden />
      </button>
    );
  } else if (waiting > 0) {
    tone = "waiting";
    icon = <CloudUpload className={cn("h-5 w-5 shrink-0", uploading && "animate-pulse")} aria-hidden />;
    text = t("waitingUploads", { count: waiting });
    action = uploadNow;
  } else if (checked) {
    icon = <CheckCircle2 className="h-5 w-5 shrink-0 text-mint" aria-hidden />;
    text = t("allSent");
  }

  return (
    <div className="flex flex-col gap-2">
      <div className={cn("flex min-h-14 items-center gap-3 rounded-xl border px-3 py-1.5", TONES[tone])}>
        {icon}
        {/* Always in the page, so screen readers hear each change. */}
        <span aria-live="polite" className="line-clamp-3 min-w-0 flex-1 text-sm font-semibold">
          {text}
        </span>
        {action}
      </div>

      {showList && (
        <ul
          id={listId}
          className="flex flex-col gap-3 rounded-xl border border-[var(--brand-danger-line)] bg-[var(--brand-danger-soft)] p-3 text-[var(--brand-surface-fg)]"
        >
          {failed.map((order) => {
            const app = apps.find((candidate) => candidate.id === order.deliveryAppId);
            const editing = order.id === editingId;
            return (
              <li key={order.id} className="flex flex-col gap-2 border-b border-[var(--brand-danger-line)] pb-3 last:border-0 last:pb-0">
                <p className="text-sm font-bold">
                  <bdi>{order.orderNumber}</bdi>
                  {app && <span className="font-medium text-[var(--brand-surface-fg-muted)]"> · {app.name}</span>}
                </p>
                {/* The server's own words stay in the logs: workers get the reason in their language. */}
                <p className="text-sm">{t(`failedReason.${failedReason(order.errorCode)}`)}</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => edit(order.id)}
                    disabled={editing}
                    className="min-h-11 flex-1 rounded-lg bg-[var(--brand-primary)] px-3 text-sm font-bold text-[var(--brand-primary-fg)] disabled:bg-[var(--brand-surface-fg-soft)] disabled:text-[var(--brand-surface-fg)]"
                  >
                    {editing ? t("editingOrder") : t("editOrder")}
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(order.id)}
                    className="min-h-11 flex-1 rounded-lg border border-[var(--brand-danger)] bg-[var(--brand-surface)] px-3 text-sm font-bold text-[var(--brand-danger)]"
                  >
                    {t("removeOrder")}
                  </button>
                </div>
              </li>
            );
          })}
          <li className="flex flex-col gap-2">
            <p className="text-xs">{t("failedHint")}</p>
            {/* Sending the same order again only helps once the office fixed the cause, e.g. assigned a branch. */}
            {failed.some((order) => retryCanHelp(order.errorCode)) && (
              <button
                type="button"
                onClick={retry}
                className="min-h-11 self-start rounded-lg border border-current px-4 text-sm font-bold"
              >
                {t("retryFailed")}
              </button>
            )}
          </li>
        </ul>
      )}
    </div>
  );
}
