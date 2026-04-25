'use client';

import { useTranslations, useLocale } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle, Clock, MapPin, ArrowRight } from 'lucide-react';

const easeOut = [0.22, 1, 0.36, 1] as [number, number, number, number];

export default function AboutSection() {
  const t = useTranslations('about');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const prefersReduced = useReducedMotion();

  const slideIn = (dir: 'left' | 'right', delay = 0) =>
    prefersReduced
      ? {}
      : {
          initial: { opacity: 0, x: dir === 'left' ? -48 : 48 },
          whileInView: { opacity: 1, x: 0 },
          viewport: { once: true, margin: '-60px' },
          transition: { duration: 0.8, delay, ease: easeOut },
        };

  return (
    <section
      id="about"
      className="relative overflow-hidden py-24 sm:py-32 lg:py-40"
      style={{ background: '#f2f2f2' }}
    >
      {/* Subtle accent */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute top-0 start-1/3 -translate-x-1/2 h-[400px] w-[600px] rounded-full opacity-50"
          style={{ background: 'radial-gradient(circle, rgba(79,197,223,0.07) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 end-1/4 h-[300px] w-[400px] rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(92,191,143,0.06) 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-16 px-6 lg:grid-cols-2 lg:gap-20 items-center">

        {/* ── Text column ── */}
        <motion.div {...slideIn(isAr ? 'right' : 'left')} className="flex flex-col">
          <span className={`mb-4 inline-block text-xs font-bold uppercase tracking-widest text-sky ${isAr ? 'font-arabic' : ''}`}>
            {t('label')}
          </span>

          <h2 className={`text-4xl font-black leading-tight text-navy sm:text-5xl ${isAr ? 'font-arabic' : ''}`}>
            {t('heading')}
          </h2>

          <p className={`mt-6 text-base leading-relaxed text-charcoal/70 ${isAr ? 'font-arabic' : ''}`}>
            {t('body1')}
          </p>
          <p className={`mt-4 text-base leading-relaxed text-charcoal/70 ${isAr ? 'font-arabic' : ''}`}>
            {t('body2')}
          </p>

          {/* CTA */}
          <a
            href="/sign-up"
            className={`mt-10 inline-flex w-fit items-center gap-2 text-sm font-semibold text-sky transition-all hover:gap-3 ${isAr ? 'font-arabic' : ''}`}
          >
            {t('label')} <ArrowRight size={16} strokeWidth={1.5} className={isAr ? 'rotate-180' : ''} />
          </a>
        </motion.div>

        {/* ── Card stack visual ── */}
        <motion.div {...slideIn(isAr ? 'left' : 'right', 0.15)} className="relative flex items-center justify-center">
          <div className="relative h-[380px] w-full max-w-[400px]">

            {/* Card 3 — background */}
            <div
              className="absolute inset-x-8 top-0"
              style={{
                transform: 'rotate(4deg) translateY(60px)',
                borderRadius: '16px',
                background: 'white',
                border: '1px solid rgba(23,43,73,0.08)',
                boxShadow: '0 4px 20px rgba(23,43,73,0.06)',
                height: '200px',
              }}
            />

            {/* Card 2 — middle */}
            <div
              className="absolute inset-x-4 top-6"
              style={{
                transform: 'rotate(-2deg)',
                borderRadius: '16px',
                background: 'white',
                border: '1px solid rgba(23,43,73,0.08)',
                boxShadow: '0 6px 24px rgba(23,43,73,0.08)',
                height: '220px',
              }}
            />

            {/* Card 1 — front (Approved) */}
            <div
              className="absolute inset-x-0 top-12 rounded-[20px] p-6"
              style={{
                background: '#172b49',
                border: '1px solid rgba(79,197,223,0.15)',
                boxShadow: '0 24px 80px rgba(23,43,73,0.25), 0 0 0 1px rgba(79,197,223,0.06)',
              }}
            >
              {/* Card header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-mono text-white/30 tracking-widest">ORD-1087</p>
                  <p className={`text-sm font-semibold text-white mt-0.5 ${isAr ? 'font-arabic' : ''}`}>
                    {t('cardBranch')}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-mint/15 border border-mint/25 px-3 py-1 text-xs font-semibold text-mint">
                  <CheckCircle size={11} strokeWidth={2} />
                  {t('cardApproved')}
                </span>
              </div>

              {/* Amount */}
              <div className="my-4 border-t border-white/[0.06] pt-4">
                <p className="text-xs text-white/30 mb-1">Order Total</p>
                <p className="font-mono text-2xl font-black text-white">{t('cardAmount')}</p>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-white/30">
                  <span>Verification</span>
                  <span className="text-mint">100%</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full w-full rounded-full bg-gradient-cta shadow-glow-mint" />
                </div>
              </div>

              {/* Meta */}
              <div className="mt-4 flex items-center gap-4 text-xs text-white/25">
                <span className="flex items-center gap-1"><Clock size={10} /> 2 min ago</span>
                <span className="flex items-center gap-1"><MapPin size={10} /> {t('cardBranch')}</span>
              </div>
            </div>

            {/* Floating tag — Needs Review */}
            <div
              className="absolute -end-4 bottom-4 rounded-[14px] px-4 py-3"
              style={{
                background: '#172b49',
                border: '1px solid rgba(240,160,48,0.25)',
                boxShadow: '0 8px 24px rgba(23,43,73,0.2)',
                animation: prefersReduced ? 'none' : 'float-slow 5s ease-in-out 1s infinite',
              }}
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span className={`text-xs font-semibold text-amber-400/80 ${isAr ? 'font-arabic' : ''}`}>
                  {t('cardReview')}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
