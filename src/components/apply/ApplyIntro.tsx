import { Clock, Timer, Wallet, type LucideIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

const HIGHLIGHTS: readonly { key: string; icon: LucideIcon }[] = [
  { key: 'quick', icon: Timer },
  { key: 'reply', icon: Clock },
  { key: 'noPayment', icon: Wallet },
];

/** Page heading and reassurance points above the form. Server-rendered: it is the LCP. */
export default async function ApplyIntro({ headingId }: { headingId: string }) {
  const t = await getTranslations('apply');

  return (
    <header className="text-center">
      <h1 id={headingId} className="text-balance text-4xl font-bold leading-tight text-white sm:text-5xl rtl:leading-snug">
        {t('heading')}
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-white/70 sm:text-lg">
        {t('subheading')}
      </p>
      <ul role="list" className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        {HIGHLIGHTS.map(({ key, icon: Icon }) => (
          <li key={key} className="inline-flex items-center gap-2 text-sm font-medium text-white/75">
            <Icon aria-hidden="true" focusable="false" size={16} className="shrink-0 text-white" />
            {t(`highlights.${key}`)}
          </li>
        ))}
      </ul>
    </header>
  );
}
