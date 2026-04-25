'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Sparkles, ArrowRight } from 'lucide-react';
import { PLANS, type PlanKey } from '@/config/plans';
import { Link } from '@/i18n/navigation';

export default function PlansSection() {
  const t = useTranslations('plans');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const prefersReduced = useReducedMotion();
  const [isAnnual, setIsAnnual] = useState(false);

  const plans: {
    key: PlanKey;
    name: string;
    price: string;
    origPrice: string | null;
    isPopular: boolean;
    isEnterprise: boolean;
    features: string[];
  }[] = [
    {
      key: 'starter',
      name: t('starter'),
      price: isAnnual ? t('starterAnnualPrice') : t('starterPrice'),
      origPrice: t('starterPrice'),
      isPopular: false,
      isEnterprise: false,
      features: [
        `${t('starterBranches')} ${t('branches')}`,
        `${t('starterUsers')} ${t('users')}`,
        `${t('starterHistory')} ${t('orderHistory')}`,
        `${t('starterSupport')} ${t('support')}`,
      ],
    },
    {
      key: 'growth',
      name: t('growth'),
      price: isAnnual ? t('growthAnnualPrice') : t('growthPrice'),
      origPrice: t('growthPrice'),
      isPopular: true,
      isEnterprise: false,
      features: [
        `${t('growthBranches')} ${t('branches')}`,
        `${t('growthUsers')} ${t('users')}`,
        `${t('growthHistory')} ${t('orderHistory')}`,
        `${t('growthSupport')} ${t('support')}`,
      ],
    },
    {
      key: 'enterprise',
      name: t('enterprise'),
      price: t('enterprisePrice'),
      origPrice: null,
      isPopular: false,
      isEnterprise: true,
      features: [
        `${t('enterpriseBranches')} ${t('branches')}`,
        `${t('enterpriseUsers')} ${t('users')}`,
        `${t('enterpriseHistory')} ${t('orderHistory')}`,
        `${t('enterpriseSupport')} ${t('support')}`,
      ],
    },
  ];

  return (
    <section
      id="plans"
      className="relative overflow-hidden py-24 sm:py-32 lg:py-40"
      style={{ background: 'linear-gradient(180deg, #060f1a 0%, #0d1e35 40%, #0a1625 100%)' }}
    >
      {/* Sky glow at top */}
      <div className="pointer-events-none absolute inset-x-0 top-0" aria-hidden>
        <div className="mx-auto h-[300px] w-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, rgba(79,197,223,0.25) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Header */}
        <motion.div
          {...(prefersReduced ? {} : {
            initial: { opacity: 0, y: 24 },
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true },
            transition: { duration: 0.6 },
          })}
          className="mb-12 text-center"
        >
          <span className={`inline-block mb-4 text-xs font-bold uppercase tracking-widest text-sky/70 ${isAr ? 'font-arabic' : ''}`}>
            {t('label')}
          </span>
          <h2 className={`text-4xl font-black text-white sm:text-5xl ${isAr ? 'font-arabic' : ''}`}>
            {t('heading')}
          </h2>
        </motion.div>

        {/* Billing toggle */}
        <div className="mb-14 flex justify-center">
          <div
            className="inline-flex items-center gap-1 rounded-full p-1"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {(['monthly', 'annually'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setIsAnnual(period === 'annually')}
                className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
                  (period === 'annually') === isAnnual
                    ? 'bg-gradient-cta text-navy shadow-glow-sky'
                    : 'text-white/50 hover:text-white'
                } ${isAr ? 'font-arabic' : ''}`}
              >
                {t(period)}
                {period === 'annually' && (
                  <span className="rounded-full bg-navy px-2 py-0.5 text-[10px] font-black text-sky">
                    {t('annualDiscount')}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.key}
              {...(prefersReduced ? {} : {
                initial: { opacity: 0, y: 40 },
                whileInView: { opacity: 1, y: 0 },
                viewport: { once: true, margin: '-40px' },
                transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
              })}
              className={`relative rounded-2xl p-8 flex flex-col ${plan.isPopular ? 'lg:-mt-4 lg:pb-12' : ''}`}
              style={
                plan.isPopular
                  ? {
                      background: 'linear-gradient(135deg, #4fc5df 0%, #5cbf8f 100%)',
                      boxShadow: '0 0 60px rgba(79,197,223,0.3), 0 0 120px rgba(79,197,223,0.1)',
                    }
                  : {
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }
              }
            >
              {/* Popular badge */}
              {plan.isPopular && (
                <div className="absolute -top-3 start-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1.5 rounded-full bg-navy px-4 py-1.5 text-xs font-bold text-sky whitespace-nowrap">
                    <Sparkles size={11} strokeWidth={2} />
                    {t('mostPopular')}
                  </span>
                </div>
              )}

              {/* Plan name + limits */}
              <h3 className={`text-lg font-bold ${plan.isPopular ? 'text-navy' : 'text-white'} ${isAr ? 'font-arabic' : ''}`}>
                {plan.name}
              </h3>
              <p className={`mt-1 text-xs ${plan.isPopular ? 'text-navy/50' : 'text-white/30'}`}>
                {PLANS[plan.key].max_branches === 999
                  ? `Unlimited ${t('branches').toLowerCase()}`
                  : `${PLANS[plan.key].max_branches} ${t('branches')}`}
                {' · '}
                {PLANS[plan.key].max_users} {t('users')}
              </p>

              {/* Price */}
              <div className="mt-6 flex items-baseline gap-2">
                {plan.isEnterprise ? (
                  <span className={`text-2xl font-black ${plan.isPopular ? 'text-navy' : 'text-white'} ${isAr ? 'font-arabic' : ''}`}>
                    {plan.price}
                  </span>
                ) : (
                  <>
                    {isAnnual && plan.origPrice && (
                      <span className={`text-lg line-through ${plan.isPopular ? 'text-navy/40' : 'text-white/25'}`}>
                        {plan.origPrice}
                      </span>
                    )}
                    <span className={`font-mono text-5xl font-black ${plan.isPopular ? 'text-navy' : 'text-white'}`}>
                      {plan.price}
                    </span>
                    <span className={`text-base font-medium ${plan.isPopular ? 'text-navy/60' : 'text-white/40'}`}>
                      {t('currency')}{t('perMonth')}
                    </span>
                  </>
                )}
              </div>

              {/* Divider */}
              <div className={`my-7 h-px ${plan.isPopular ? 'bg-navy/15' : 'bg-white/[0.06]'}`} />

              {/* Features */}
              <ul className="flex flex-col gap-3.5">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-3">
                    <Check
                      size={15}
                      strokeWidth={2.5}
                      className={`mt-0.5 shrink-0 ${plan.isPopular ? 'text-navy/70' : 'text-mint'}`}
                    />
                    <span className={`text-sm ${plan.isPopular ? 'text-navy/80' : 'text-white/60'} ${isAr ? 'font-arabic' : ''}`}>
                      {feat}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA — now links to /apply?plan= */}
              <div className="mt-auto pt-8">
                {plan.isPopular ? (
                  <Link
                    href={`/apply?plan=${plan.key}`}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-navy px-6 py-3.5 text-sm font-bold text-white transition-all hover:bg-navy/80 hover:shadow-glow-sky active:scale-[0.98]"
                  >
                    {t('getStarted')}
                    <ArrowRight size={14} strokeWidth={2} className={isAr ? 'rotate-180' : ''} />
                  </Link>
                ) : plan.isEnterprise ? (
                  <button className={`flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-white/80 transition-all hover:border-sky/30 hover:text-sky ${isAr ? 'font-arabic' : ''}`}>
                    {t('contactUs')}
                  </button>
                ) : (
                  <Link
                    href={`/apply?plan=${plan.key}`}
                    className={`flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-white/80 transition-all hover:border-sky/30 hover:bg-white/[0.07] hover:text-white ${isAr ? 'font-arabic' : ''}`}
                  >
                    {t('getStarted')}
                    <ArrowRight size={14} strokeWidth={2} className={isAr ? 'rotate-180' : ''} />
                  </Link>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
