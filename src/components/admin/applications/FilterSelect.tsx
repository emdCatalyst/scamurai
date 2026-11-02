'use client';

import { useId } from 'react';
import { ChevronDown } from 'lucide-react';

export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface FilterSelectProps<T extends string> {
  /** Accessible name; the selected option's text is the visible label. */
  label: string;
  value: T;
  options: readonly FilterOption<T>[];
  onChange: (value: T) => void;
}

/** Native select styled as the admin filter pill: keyboard, screen-reader and mobile friendly. */
export default function FilterSelect<T extends string>({ label, value, options, onChange }: FilterSelectProps<T>) {
  const id = useId();

  return (
    <div className="relative w-full sm:w-auto">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          const next = options.find((option) => option.value === event.target.value);
          if (next) onChange(next.value);
        }}
        className="w-full appearance-none cursor-pointer ps-4 pe-10 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-slate-500"
      />
    </div>
  );
}
