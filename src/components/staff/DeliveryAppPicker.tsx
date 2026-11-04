"use client";

import { useId } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface DeliveryApp {
  id: string;
  name: string;
}

interface DeliveryAppPickerProps {
  apps: DeliveryApp[];
  selectedId?: string;
  onSelect: (id: string) => void;
  /** Id of the chips' group, so the form can bring the worker to it. */
  id?: string;
  disabled?: boolean;
  /** The worker tried to save without a choice, or the choice was refused. */
  invalid?: boolean;
  /** Id of a message about the choice. */
  describedBy?: string;
  className?: string;
}

/**
 * The order's delivery app. The chips wrap onto more rows instead of
 * scrolling sideways, so every app the brand offers is in sight. The form
 * keeps the choice, and checks it is still one of these apps.
 */
export default function DeliveryAppPicker({
  apps,
  selectedId,
  onSelect,
  id,
  disabled = false,
  invalid = false,
  describedBy,
  className,
}: DeliveryAppPickerProps) {
  const t = useTranslations("brand.submit");
  const labelId = useId();

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span id={labelId} className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-surface-fg-muted)]">
        {t('deliveryApp')}
      </span>
      {apps.length === 0 ? (
        <p
          id={id}
          tabIndex={-1}
          className="rounded-xl border border-[var(--brand-danger-line)] bg-[var(--brand-danger-soft)] p-3 text-sm font-medium text-[var(--brand-surface-fg)] outline-none"
        >
          {t('noDeliveryApps')}
        </p>
      ) : (
        <div
          id={id}
          tabIndex={-1}
          role="group"
          aria-labelledby={labelId}
          aria-describedby={describedBy}
          className={cn(
            "flex flex-wrap gap-2 rounded-3xl outline-none",
            invalid && "ring-2 ring-[var(--brand-danger)] ring-offset-2"
          )}
        >
          {apps.map((app) => {
            const selected = selectedId === app.id;
            return (
              <button
                key={app.id}
                type="button"
                aria-pressed={selected}
                disabled={disabled}
                onClick={() => onSelect(app.id)}
                className={cn(
                  "flex min-h-12 items-center gap-1.5 rounded-full border px-5 text-sm font-semibold transition-colors",
                  selected
                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[var(--brand-primary-fg)] shadow-md shadow-[color:var(--brand-primary-soft)]"
                    : "border-[var(--brand-surface-fg-muted)] bg-[var(--brand-surface)] text-[var(--brand-surface-fg)]"
                )}
              >
                {/* Not by colour alone: the chosen app also has a tick. */}
                {selected && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                {app.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
