'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { MAX_SEARCH_LENGTH, SEARCH_DEBOUNCE_MS, normalizeSearch } from './listFilters';

interface SearchFieldProps {
  /** The search currently applied (from the URL). */
  value: string;
  onSearch: (search: string) => void;
}

/** Debounced search box; Enter applies immediately. */
export default function SearchField({ value, onSearch }: SearchFieldProps) {
  const t = useTranslations('admin.applications.filters');
  const id = useId();
  const [text, setText] = useState(value);
  const [appliedValue, setAppliedValue] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The URL changed elsewhere (back/forward, another filter): show its search,
  // unless it is just the normalised form of what is being typed.
  if (value !== appliedValue) {
    setAppliedValue(value);
    if (normalizeSearch(text) !== value) setText(value);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const apply = (next: string) => {
    clearTimeout(timer.current);
    const search = normalizeSearch(next);
    if (search !== value) onSearch(search);
  };

  return (
    <form
      role="search"
      className="relative w-full sm:max-w-xs md:max-w-sm"
      onSubmit={(event) => {
        event.preventDefault();
        apply(text);
      }}
    >
      <label htmlFor={id} className="sr-only">
        {t('searchLabel')}
      </label>
      <Search
        size={18}
        aria-hidden="true"
        className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-500"
      />
      <input
        id={id}
        type="search"
        value={text}
        maxLength={MAX_SEARCH_LENGTH}
        autoComplete="off"
        enterKeyHint="search"
        placeholder={t('searchPlaceholder')}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => apply(next), SEARCH_DEBOUNCE_MS);
        }}
        className="w-full ps-10 pe-4 py-2 bg-slate-100 border border-transparent focus:bg-white focus:border-sky-500/50 focus-visible:ring-4 focus-visible:ring-sky-500/10 rounded-xl text-sm text-slate-900 placeholder:text-slate-500 transition-colors outline-none"
      />
    </form>
  );
}
