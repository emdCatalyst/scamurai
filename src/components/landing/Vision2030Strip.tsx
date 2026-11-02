import { getTranslations } from 'next-intl/server';
import { VISION_2030_LOCKUP } from './assets';
import Picture from './Picture';

export default async function Vision2030Strip() {
  const t = await getTranslations('about');

  return (
    <div className="relative overflow-hidden border-y border-navy/10 bg-offwhite py-5">
      <div className="relative mx-auto flex max-w-7xl items-center justify-center gap-6 px-6">
        <div aria-hidden="true" className="h-px flex-1 bg-gradient-to-r from-transparent to-navy/10" />
        <Picture image={VISION_2030_LOCKUP} alt={t('visionAlt')} className="h-auto w-40 shrink-0 opacity-70" />
        <div aria-hidden="true" className="h-px flex-1 bg-gradient-to-l from-transparent to-navy/10" />
      </div>
    </div>
  );
}
