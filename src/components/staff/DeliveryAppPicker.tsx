"use client";

import { useEffect } from "react";
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
  className?: string;
}

export default function DeliveryAppPicker({
  apps,
  selectedId,
  onSelect,
  className,
}: DeliveryAppPickerProps) {
  const t = useTranslations("brand.submit");
  // Persistence: last selected delivery app is stored in sessionStorage
  useEffect(() => {
    if (!selectedId) {
      const lastId = sessionStorage.getItem("last_delivery_app_id");
      if (lastId && apps.some(a => a.id === lastId)) {
        onSelect(lastId);
      }
    }
  }, [apps, selectedId, onSelect]);

  const handleSelect = (id: string) => {
    onSelect(id);
    sessionStorage.setItem("last_delivery_app_id", id);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-surface-fg-muted)]">
        {t('deliveryApp')}
      </label>
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {apps.map((app) => (
          <button
            key={app.id}
            type="button"
            onClick={() => handleSelect(app.id)}
            className={cn(
              "flex-shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-all border",
              selectedId === app.id
                ? "bg-[var(--brand-primary)] text-[var(--brand-primary-fg)] border-[var(--brand-primary)] shadow-md shadow-[var(--brand-primary)]/20"
                : "bg-[var(--brand-surface)] text-[var(--brand-surface-fg)] border-[var(--brand-border)] hover:border-[var(--brand-primary)]/50"
            )}
          >
            {app.name}
          </button>
        ))}
      </div>
    </div>
  );
}
