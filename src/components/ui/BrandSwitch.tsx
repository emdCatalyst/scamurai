'use client';

import { cn } from "@/lib/utils";

interface BrandSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function BrandSwitch({ checked, onChange, disabled }: BrandSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20",
        checked ? "bg-[var(--brand-primary)]" : "bg-[var(--brand-surface-fg)]/10",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full shadow ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5 rtl:-translate-x-5 bg-[var(--brand-primary-fg)]" : "translate-x-0 bg-white"
        )}
      />
    </button>
  );
}
