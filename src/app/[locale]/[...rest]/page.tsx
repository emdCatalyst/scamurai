import { notFound } from 'next/navigation';

/**
 * Any locale-prefixed URL that no route matches lands here and renders the
 * localized 404 (app/[locale]/not-found.tsx) inside the [locale] layout, so the
 * document keeps its lang and dir. Without it, Next.js falls back to the root
 * 404, which has no <html lang>.
 */
export default function UnknownLocalizedPage(): never {
  notFound();
}
