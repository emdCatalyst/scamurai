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
    <Section labelledBy="values-title" className="bg-offwhite text-charcoal">
      <div className="mx-auto max-w-6xl px-6 lg:px-10">
        <div className="reveal mb-14 text-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-widest text-cyan-700">{t('label')}</p>
          <h2 id="values-title" className="text-balance text-3xl font-black text-navy sm:text-4xl lg:text-5xl">
            {t('heading')}
          </h2>
        </div>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {VALUES.map(({ key, icon: Icon }, index) => (
            <li
              key={key}
              className="reveal group relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-8 shadow-[0_1px_3px_rgba(11,11,11,0.04)] transition-shadow duration-300 hover:shadow-[0_12px_40px_rgba(11,11,11,0.1)]"
            >
              <span aria-hidden="true" className="absolute end-5 top-4 tabular-nums text-6xl font-black text-navy/[0.05]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-sky/20 bg-sky/10 text-sky">
                <Icon aria-hidden="true" size={24} strokeWidth={1.5} />
              </span>
              <h3 className="text-xl font-bold text-navy">{t(`items.${key}.title`)}</h3>
              <p className="mt-3 text-sm leading-relaxed text-charcoal/75">{t(`items.${key}.description`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
