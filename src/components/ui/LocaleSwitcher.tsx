'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { useTransition } from 'react';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocaleSwitcherProps {
  /** Tailwind classes to override the default styling. */
  className?: string;
  /** Show the icon (default true). Set false for a label-only button. */
  showIcon?: boolean;
}

/**
 * Flips between `en` and `ar` while keeping the current path + query.
 * Shared across BrandShell, AdminShell, and the staff submit header.
 */
export default function LocaleSwitcher({
  className,
  showIcon = true,
}: LocaleSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const nextLocale = locale === 'ar' ? 'en' : 'ar';
  // The label always shows the *other* locale — what the click will switch to.
  const label = nextLocale === 'ar' ? 'AR' : 'EN';

  const onClick = () => {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      title={`Switch to ${nextLocale === 'ar' ? 'العربية' : 'English'}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/60 px-3 py-1.5 text-[11px] font-bold tracking-wider text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:opacity-60',
        className
      )}
    >
      {showIcon && <Languages size={14} strokeWidth={2} />}
      <span>{label}</span>
    </button>
  );
}
