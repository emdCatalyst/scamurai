"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Calendar, X } from "lucide-react";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";

interface DateRangePickerProps {
  dateFrom: string;
  dateTo: string;
}

function toIsoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function DateRangePicker({
  dateFrom,
  dateTo,
}: DateRangePickerProps) {
  const t = useTranslations("brand.orders.filters");
  const router = useRouter();
  const searchParams = useSearchParams();

  const setRange = (from: string | null, to: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (from) params.set("date_from", from);
    else params.delete("date_from");
    if (to) params.set("date_to", to);
    else params.delete("date_to");
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  const applyPreset = (preset: "today" | "week" | "month") => {
    const now = new Date();
    let from: Date, to: Date;
    switch (preset) {
      case "today":
        from = startOfDay(now);
        to = endOfDay(now);
        break;
      case "week":
        from = startOfWeek(now, { weekStartsOn: 0 });
        to = endOfWeek(now, { weekStartsOn: 0 });
        break;
      case "month":
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
    }
    setRange(toIsoDate(from), toIsoDate(to));
  };

  const hasRange = Boolean(dateFrom || dateTo);

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto lg:flex-1 lg:justify-end">
      <div className="flex items-center gap-2 bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-xl py-2 ps-3 pe-2 w-full sm:w-auto">
        <Calendar
          size={14}
          className="text-[var(--brand-surface-fg-muted)] shrink-0"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setRange(e.target.value || null, dateTo || null)}
          aria-label={t("dateFrom")}
          className="bg-transparent text-sm text-[var(--brand-surface-fg)] focus:outline-none min-w-0 w-full"
        />
        <span className="text-[var(--brand-surface-fg-muted)] text-sm shrink-0">–</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setRange(dateFrom || null, e.target.value || null)}
          aria-label={t("dateTo")}
          className="bg-transparent text-sm text-[var(--brand-surface-fg)] focus:outline-none min-w-0 w-full"
        />
        {hasRange && (
          <button
            type="button"
            onClick={() => setRange(null, null)}
            aria-label={t("presets.clear")}
            className="text-[var(--brand-surface-fg-muted)] hover:text-[var(--brand-danger)] transition-colors shrink-0 p-1"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 p-1 bg-[var(--brand-surface-fg)]/5 rounded-xl">
        <PresetButton onClick={() => applyPreset("today")} label={t("presets.today")} />
        <PresetButton onClick={() => applyPreset("week")} label={t("presets.thisWeek")} />
        <PresetButton onClick={() => applyPreset("month")} label={t("presets.thisMonth")} />
      </div>
    </div>
  );
}

function PresetButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-bold px-3 py-1.5 rounded-lg text-[var(--brand-surface-fg-muted)] hover:bg-[var(--brand-surface)] hover:text-[var(--brand-text-accent)] transition-all whitespace-nowrap"
    >
      {label}
    </button>
  );
}
