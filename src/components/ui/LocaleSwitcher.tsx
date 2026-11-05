'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { usePathname } from '@/i18n/navigation';
import { localizedPath } from '@/i18n/paths';
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
 * Flips between `en` and `ar` while keeping the current path. The target is
 * built with localizedPath: next-intl's router would keep an /en prefix when
 * switching to English, which costs the phone a redirect.
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
  // Each language named in itself: the hint reads right whichever language the page is in.
  const nativeName = nextLocale === 'ar' ? 'العربية' : 'English';

  const onClick = () => {
    startTransition(() => {
      router.replace(localizedPath(nextLocale, pathname));
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      title={nativeName}
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
