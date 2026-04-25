'use client';

import { useTranslations, useLocale } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';
import { Camera, CheckCircle, BarChart2 } from 'lucide-react';

const steps = [
  { icon: Camera,      key: 'step1', color: '#4fc5df' },
  { icon: CheckCircle, key: 'step2', color: '#5cbf8f' },
  { icon: BarChart2,   key: 'step3', color: '#4fc5df' },
];

export default function HowItWorksSection() {
  const t = useTranslations('howItWorks');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const prefersReduced = useReducedMotion();

  return (
    <section
      id="how"
      className="relative overflow-hidden py-24 sm:py-32 lg:py-40"
      style={{ background: 'linear-gradient(180deg, #0a1928 0%, #172b49 50%, #0d2035 100%)' }}
    >
      {/* Decorative orb */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
        <div className="h-[600px] w-[600px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, rgba(79,197,223,0.3) 0%, transparent 60%)' }} />
      </div>

      <div className="relative mx-auto max-w-5xl px-6">

        {/* Header */}
        <motion.div
          {...(prefersReduced ? {} : {
            initial: { opacity: 0, y: 24 },
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true },
            transition: { duration: 0.6 },
          })}
          className="text-center mb-20"
        >
          <span className={`inline-block mb-4 text-xs font-bold uppercase tracking-widest text-sky/70 ${isAr ? 'font-arabic' : ''}`}>
            {t('label')}
          </span>
          <h2 className={`text-4xl font-black text-white sm:text-5xl ${isAr ? 'font-arabic' : ''}`}>
            {t('heading')}
          </h2>
        </motion.div>

        {/* Steps grid */}
        <div className="relative grid gap-8 md:grid-cols-3">

          {/* Connector lines (desktop) */}
          <div className="pointer-events-none absolute top-14 start-[calc(16.7%+28px)] end-[calc(16.7%+28px)] hidden h-px md:block"
            style={{ background: 'linear-gradient(90deg, rgba(79,197,223,0.3), rgba(92,191,143,0.3))' }}
          />

          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.key}
                {...(prefersReduced ? {} : {
                  initial: { opacity: 0, y: 36 },
                  whileInView: { opacity: 1, y: 0 },
                  viewport: { once: true, margin: '-40px' },
                  transition: { duration: 0.6, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
                })}
                className="flex flex-col items-center text-center"
              >
                {/* Step number + Icon */}
                <div className="relative mb-6">
                  {/* Outer ring */}
                  <div
                    className="h-28 w-28 rounded-full"
                    style={{
                      border: `1px solid ${step.color}22`,
                      background: `radial-gradient(circle, ${step.color}12 0%, transparent 70%)`,
                    }}
                  />
                  {/* Inner circle */}
                  <div
                    className="absolute inset-4 rounded-full flex items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${step.color}22 0%, ${step.color}0a 100%)`,
                      border: `1px solid ${step.color}30`,
                    }}
                  >
                    <Icon size={28} strokeWidth={1.5} style={{ color: step.color }} />
                  </div>
                  {/* Step badge */}
                  <div
                    className="absolute -top-1 -end-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-black text-navy"
                    style={{ background: `linear-gradient(135deg, #4fc5df, #5cbf8f)` }}
                  >
                    {i + 1}
                  </div>
                </div>

                <h3 className={`text-xl font-bold text-white ${isAr ? 'font-arabic' : ''}`}>
                  {t(`${step.key}Title`)}
                </h3>
                <p className={`mt-3 text-sm leading-relaxed text-white/45 max-w-[220px] ${isAr ? 'font-arabic' : ''}`}>
                  {t(`${step.key}Desc`)}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
