import { ChevronRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { absoluteUrl, localizedPath } from '@/lib/seo/site';

export interface BreadcrumbItem {
  label: string;
  /** Locale-less path, e.g. `/` or `/services/order-protection`. */
  path: string;
  /** In-page anchor without `#`, e.g. `services`. */
  hash?: string;
}

/** Absolute URL of a crumb, for `breadcrumbJsonLd` built from the same items. */
export function breadcrumbUrl(locale: Locale, item: BreadcrumbItem): string {
  return absoluteUrl(`${localizedPath(locale, item.path)}${item.hash ? `#${item.hash}` : ''}`);
}

/** Visible breadcrumb trail; the last item is the current page. Server component, no JS. */
export default function Breadcrumbs({
  label,
  items,
  className,
}: {
  /** Accessible name of the navigation landmark. */
  label: string;
  items: readonly BreadcrumbItem[];
  className?: string;
}) {
  return (
    <nav aria-label={label} className={className}>
      <ol role="list" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/65">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li key={`${item.path}#${item.hash ?? ''}`} className="flex items-center gap-2">
              {index > 0 && (
                <ChevronRight aria-hidden="true" focusable="false" size={14} className="shrink-0 text-white/40 rtl:rotate-180" />
              )}
              {isCurrent ? (
                <span aria-current="page" className="font-medium text-white/90">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={{ pathname: item.path, hash: item.hash }}
                  className="rounded-sm transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky/60"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
