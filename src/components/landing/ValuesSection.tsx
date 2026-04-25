'use client';

import { useTranslations, useLocale } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';
import { Eye, Shield, Zap } from 'lucide-react';

const values = [
  { icon: Eye,    key: 'v1', accent: '#4fc5df', number: '01' },
  { icon: Shield, key: 'v2', accent: '#5cbf8f', number: '02' },
  { icon: Zap,    key: 'v3', accent: '#4fc5df', number: '03' },
];

const easeOut = [0.22, 1, 0.36, 1] as [number, number, number, number];

// Variants defined once — no conditional spreading
const headerVariants = {
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const cardVariants = {
  hidden:  { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, delay: i * 0.12, ease: easeOut },
  }),
};

export default function ValuesSection() {
  const t = useTranslations('values');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const prefersReduced = useReducedMotion();

  // When reduced motion is on, start already in visible state
  const initial = prefersReduced ? 'visible' : 'hidden';

  return (
    <section
      id="values"
      className="relative overflow-hidden py-24 sm:py-32 lg:py-40"
      style={{ background: '#f2f2f2' }}
    >
      {/* Decorative accents */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute -top-32 end-0 h-[400px] w-[500px] rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(79,197,223,0.08) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 start-1/4 h-[300px] w-[400px] rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(92,191,143,0.06) 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Header */}
        <motion.div
          variants={headerVariants}
          initial={initial}
          whileInView="visible"
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span className={`inline-block mb-4 text-xs font-bold uppercase tracking-widest text-sky ${isAr ? 'font-arabic' : ''}`}>
            {t('label')}
          </span>
          <h2 className={`text-4xl font-black text-navy sm:text-5xl ${isAr ? 'font-arabic' : ''}`}>
            {t('heading')}
          </h2>
        </motion.div>

        {/* Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((val, i) => {
            const Icon = val.icon;
            return (
              <motion.div
                key={val.key}
                variants={cardVariants}
                custom={i}
                initial={initial}
                whileInView="visible"
                viewport={{ once: true, margin: '-40px' }}
                whileHover={prefersReduced ? undefined : { y: -4, transition: { duration: 0.3, ease: 'easeOut' } }}
                className="group relative overflow-hidden rounded-2xl bg-white p-8"
                style={{
                  border: '1px solid rgba(23,43,73,0.08)',
                  boxShadow: '0 1px 3px rgba(23,43,73,0.04)',
                }}
              >
                {/* Hover shadow overlay */}
                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ boxShadow: '0 12px 40px rgba(23,43,73,0.1)' }}
                />

                {/* Number watermark */}
                <span
                  className="absolute top-4 end-5 font-mono text-6xl font-black opacity-[0.04]"
                  style={{ color: val.accent }}
                >
                  {val.number}
                </span>

                {/* Icon */}
                <div
                  className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                  style={{
                    background: `${val.accent}18`,
                    border: `1px solid ${val.accent}20`,
                  }}
                >
                  <Icon size={24} strokeWidth={1.5} style={{ color: val.accent }} />
                </div>

                <h3 className={`text-xl font-bold text-navy ${isAr ? 'font-arabic' : ''}`}>
                  {t(`${val.key}Title`)}
                </h3>
                <p className={`mt-3 text-sm leading-relaxed text-charcoal/60 ${isAr ? 'font-arabic' : ''}`}>
                  {t(`${val.key}Desc`)}
                </p>

                {/* Bottom accent line */}
                <div
                  className="absolute bottom-0 start-0 h-0.5 w-0 transition-all duration-500 group-hover:w-full"
                  style={{ background: `linear-gradient(90deg, ${val.accent}, transparent)` }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
