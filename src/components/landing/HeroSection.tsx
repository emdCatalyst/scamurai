'use client';

import { useTranslations, useLocale } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';
import { Zap, Play, ChevronDown, ShieldCheck, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import AnimatedCounter from '@/components/ui/AnimatedCounter';

export default function HeroSection() {
  const t = useTranslations('hero');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const prefersReduced = useReducedMotion();

  const fadeUp = (delay: number) =>
    prefersReduced
      ? {}
      : {
        initial: { opacity: 0, y: 32 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
      };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-start overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #060f1a 0%, #0d1e35 40%, #091826 100%)' }}
    >
      {/* ── Background Image with Animation ── */}
      <motion.div 
        initial={{ opacity: 0, scale: 1.08 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2.5, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'url("/assets/landing%20page.svg")',
          backgroundSize: '1920px auto',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          transformOrigin: 'top center'
        }}
      />

      {/* ── Ambient Light Sweep ── */}
      <motion.div
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "linear",
          repeatDelay: 3
        }}
        className="absolute inset-0 opacity-[0.15] pointer-events-none z-[1]"
        style={{
          background: 'linear-gradient(105deg, transparent 30%, rgba(79,197,223,0.2) 45%, rgba(255,255,255,0.4) 50%, rgba(79,197,223,0.2) 55%, transparent 70%)',
          transform: 'skewX(-25deg)'
        }}
      />

      {/* ── Atmospheric glows ── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {/* Primary sky orb — top left */}
        <div
          className="absolute -top-32 -start-32 h-[700px] w-[700px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(79,197,223,0.18) 0%, rgba(79,197,223,0.05) 40%, transparent 70%)',
            animation: prefersReduced ? 'none' : 'hero-glow-pulse 6s ease-in-out infinite',
          }}
        />
        {/* Mint orb — bottom right */}
        <div
          className="absolute -bottom-48 -end-24 h-[600px] w-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(92,191,143,0.14) 0%, rgba(92,191,143,0.04) 45%, transparent 70%)',
            animation: prefersReduced ? 'none' : 'hero-glow-pulse 8s ease-in-out 2s infinite',
          }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(79,197,223,0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(79,197,223,0.04) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
            maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
          }}
        />
        {/* Ghosted samurai mark
        <div
          className="absolute end-0 top-1/2 -translate-y-1/2 translate-x-1/4 w-[520px] h-[520px] opacity-[0.025]"
          style={{ animation: prefersReduced ? 'none' : 'float-slow 10s ease-in-out infinite' }}
        >
          <Image
            src="/logos/secondy logo 2.svg"
            alt=""
            fill
            className="object-contain"
            priority
          />
        </div> */}
        
        {/* Horizontal scan line */}
        <div
          className="absolute start-0 end-0 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(79,197,223,0.4), transparent)',
            animation: prefersReduced ? 'none' : 'scan-line 4s linear infinite',
          }}
        />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 mx-auto max-w-5xl px-6 pt-[26em] pb-24 text-center">

        {/* Badge
                <motion.div {...fadeUp(0)} className="mb-8 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky/25 bg-sky/[0.08] px-4 py-1.5 text-xs font-medium tracking-wide text-sky uppercase">
            <Zap size={12} strokeWidth={2} className="shrink-0" />
            {t('badge')}
          </span>
        </motion.div> */}


        {/* Headline */}
        <motion.h1 {...fadeUp(0.1)} className={`text-black text-4xl text-bold ${isAr ? 'font-arabic' : ''}`}>
          {t('headlineStar')}
        </motion.h1>
        <motion.h1 {...fadeUp(0.1)} className={`text-6xl font-black leading-[1.05] mt-8 tracking-tight text-white  lg:text-7xl ${isAr ? 'font-arabic' : ''}`}>
          {t('headline1')} <span className="text-gradient-sky">{t('headline1Highlight')}</span>
          <br />
            {t('headline2')}
        </motion.h1>

        {/* Subheading */}
        <motion.p
          {...fadeUp(0.2)}
          className={`mx-auto mt-7 max-w-2xl text-base leading-relaxed text-white/55 sm:text-lg ${isAr ? 'font-arabic' : ''}`}
        >
          {t('subheading')}
        </motion.p>

        {/* CTAs */}
        <motion.div
          {...fadeUp(0.3)}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <a
            href="/apply"
            className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-full bg-gradient-cta px-8 py-4 text-base font-bold text-navy shadow-glow-sky transition-all duration-300 hover:shadow-glow-lg hover:scale-[1.03] active:scale-[0.98]"
          >
            {/* Shimmer */}
            <span
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: prefersReduced ? 'none' : 'shimmer 3s linear infinite',
              }}
            />
            <span className="relative">{t('ctaPrimary')}</span>
            <ChevronDown size={18} strokeWidth={2} className="relative -rotate-90 transition-transform group-hover:translate-x-0.5" />
          </a>

          <button className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/[0.04] px-6 py-4 text-base font-medium text-white/80 transition-all hover:border-white/25 hover:bg-white/[0.07] hover:text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
              <Play size={14} strokeWidth={2} className="translate-x-0.5 text-sky" />
            </span>
            {t('ctaSecondary')}
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div {...fadeUp(0.45)} className="mt-20">
          <div className="mx-auto grid max-w-2xl grid-cols-3 divide-x divide-white/[0.08]">
            {[
              { prefix: '+', target: 500, suffix: '', label: t('stat1Label') },
              { prefix: '', target: 98, suffix: '%', label: t('stat2Label') },
              { prefix: '<', target: 30, suffix: 's', label: t('stat3Label') },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 px-6">
                <div className={`flex items-baseline font-mono text-3xl font-black text-sky sm:text-4xl ${isAr ? 'font-sans' : ''}`}>
                  {stat.prefix && <span className="text-sky/60 text-2xl me-0.5">{stat.prefix}</span>}
                  <AnimatedCounter target={stat.target} suffix={stat.suffix} />
                </div>
                <p className={`text-xs font-medium text-white/40 uppercase tracking-wider ${isAr ? 'font-arabic' : ''}`}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Trust indicators */}
        <motion.div {...fadeUp(0.55)} className="mt-12 flex flex-wrap items-center justify-center gap-6">
          {[
            { icon: ShieldCheck, label: t('trust1') },
            { icon: Zap, label: t('trust2') },
            { icon: TrendingUp, label: t('trust3') },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-xs font-medium text-white/35">
              <Icon size={13} strokeWidth={1.5} className="text-sky/60" />
              {label}
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-8 start-1/2 -translate-x-1/2"
        style={{ animation: prefersReduced ? 'none' : 'bounce-y 2.5s ease-in-out infinite' }}
      >
        <ChevronDown size={22} strokeWidth={1.5} className="text-white/25" />
      </div>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#060f1a] to-transparent" />
    </section>
  );
}
