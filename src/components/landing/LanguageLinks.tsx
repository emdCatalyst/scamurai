import { getLocale, getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import LocaleSwitch from './LocaleSwitch';

/** One switch per other locale, each labelled with that language's own name. */
export default async function LanguageLinks({ className }: { className?: string }) {
  const [current, t] = await Promise.all([getLocale(), getTranslations('nav.localeNames')]);

  return routing.locales
    .filter((locale) => locale !== current)
    .map((locale) => <LocaleSwitch key={locale} locale={locale} label={t(locale)} className={className} />);
}
