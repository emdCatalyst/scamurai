import { Eye, Shield, Zap, type LucideIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Section } from '@/components/marketing/primitives';

/** Copy lives in `values.items.<key>`. */
const VALUES: readonly { key: string; icon: LucideIcon }[] = [
  { key: 'transparency', icon: Eye },
  { key: 'accountability', icon: Shield },
  { key: 'speed', icon: Zap },
];

export default async function ValuesSection() {
  const t = await getTranslations('values');

  return (
    <Section labelledBy="values-title" className="bg-paper text-navy">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <div className="reveal mb-14 text-center">
          <p className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone rtl:tracking-normal">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-sky" />
            {t('label')}
          </p>
          <h2 id="values-title" className="font-heading text-balance text-3xl font-bold text-navy sm:text-4xl lg:text-5xl rtl:leading-snug">
            {t('heading')}
          </h2>
        </div>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {VALUES.map(({ key, icon: Icon }, index) => (
            <li
              key={key}
              className="reveal relative overflow-hidden rounded-[28px] border border-line bg-white p-8"
            >
              <span aria-hidden="true" className="absolute end-6 top-5 text-sm font-semibold tabular-nums text-stone">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-navy text-white">
                <Icon aria-hidden="true" size={24} strokeWidth={1.75} />
              </span>
              <h3 className="text-xl font-bold text-navy">{t(`items.${key}.title`)}</h3>
              <p className="mt-3 text-sm leading-relaxed text-stone">{t(`items.${key}.description`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
