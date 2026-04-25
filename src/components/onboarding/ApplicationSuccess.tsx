'use client';

import { useTranslations, useLocale } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle, Mail, ArrowLeft } from 'lucide-react';
import { Link } from '@/i18n/navigation';

interface ApplicationSuccessProps {
  email: string;
}

export default function ApplicationSuccess({ email }: ApplicationSuccessProps) {
  const t = useTranslations('apply');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const prefersReduced = useReducedMotion();

  return (
    <div
      className="mx-auto max-w-lg rounded-2xl p-8 sm:p-10 text-center"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(24px)',
      }}
    >
      {/* Animated checkmark */}
      <motion.div
        className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-mint/15"
        {...(prefersReduced ? {} : {
          initial: { scale: 0 },
          animate: { scale: 1 },
          transition: { type: 'spring', stiffness: 200, damping: 15, delay: 0.1 },
        })}
      >
        <motion.div
          {...(prefersReduced ? {} : {
            initial: { pathLength: 0, opacity: 0 },
            animate: { pathLength: 1, opacity: 1 },
            transition: { duration: 0.6, delay: 0.3 },
          })}
        >
          <CheckCircle size={40} strokeWidth={1.5} className="text-mint" />
        </motion.div>
      </motion.div>

      {/* Heading — bilingual */}
      <motion.div
        {...(prefersReduced ? {} : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay: 0.4 },
        })}
      >
        <h1 className="text-2xl font-black text-white sm:text-3xl">
          {t('successHeading')}
        </h1>
      </motion.div>

      {/* Body */}
      <motion.div
        className="mt-6 space-y-3"
        {...(prefersReduced ? {} : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay: 0.5 },
        })}
      >

        <div className="inline-flex items-center gap-2 rounded-full bg-sky/10 px-4 py-1.5 text-sm text-sky">
          <Mail size={14} strokeWidth={1.5} />
          <span className="font-mono text-xs">{email}</span>
        </div>
        <p className="text-sm text-white/60 leading-relaxed">
          {t('successBody', { email })}
        </p>
        <p className='text-sky text-sm'>{t('successNote')}</p>



      </motion.div>

      {/* CTA */}
      <motion.div
        className="mt-8"
        {...(prefersReduced ? {} : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay: 0.6 },
        })}
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white/80 transition-all hover:border-sky/30 hover:text-white"
        >
          <ArrowLeft size={14} strokeWidth={1.5} className={isAr ? 'rotate-180' : ''} />
          <span>{t('backToHome')}</span>
        </Link>
      </motion.div>
    </div>
  );
}
