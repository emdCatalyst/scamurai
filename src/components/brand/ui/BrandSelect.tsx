"use client";

import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";

export type BrandSelectOption = {
  value: string;
  label: string;
};

interface BrandSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: BrandSelectOption[];
  className?: string;
  /** Optional fixed width for the dropdown panel; defaults to "min-w-[12rem]" */
  panelWidthClass?: string;
  /** Optional override for the displayed label (defaults to the matched option's label). */
  triggerLabel?: string;
  /** Used to anchor the panel start/end depending on layout. Defaults to start. */
  panelAlign?: "start" | "end";
}

export default function BrandSelect({
  value,
  onChange,
  options,
  className = "",
  panelWidthClass = "min-w-[12rem]",
  triggerLabel,
  panelAlign = "start",
}: BrandSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <div className={`relative w-full sm:w-auto ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between sm:justify-start gap-2 px-4 py-2 bg-[var(--brand-surface)] hover:bg-[var(--brand-surface-fg)]/5 border border-[var(--brand-border)] rounded-xl text-sm font-medium text-[var(--brand-surface-fg)] transition-all"
      >
        <span className="truncate">
          {triggerLabel ?? current?.label ?? options[0]?.label}
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform shrink-0 text-[var(--brand-surface-fg-muted)] ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={`absolute mt-2 ${panelWidthClass} bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-xl shadow-xl z-40 overflow-hidden max-h-[300px] overflow-y-auto ${
              panelAlign === "end" ? "end-0" : "start-0"
            }`}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm text-[var(--brand-surface-fg)] hover:bg-[var(--brand-surface-fg)]/5 transition-colors"
              >
                <span className="truncate text-start">{option.label}</span>
                {value === option.value && (
                  <Check
                    size={16}
                    className="text-[var(--brand-text-accent)] shrink-0"
                  />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
