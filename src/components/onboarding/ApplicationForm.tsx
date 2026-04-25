'use client';

import { useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { submitApplication } from '@/actions/submitApplication';
import { PLANS, type PlanKey } from '@/config/plans';
import { applicationSchema } from '@/lib/validations/application';
import ApplicationSuccess from './ApplicationSuccess';
import GlowButton from '../ui/GlowButton';

const validPlans: PlanKey[] = ['starter', 'growth', 'enterprise'];

export default function ApplicationForm() {
  const t = useTranslations('apply');
  const tPlans = useTranslations('plans');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const prefersReduced = useReducedMotion();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Pre-fill plan from query param
  const paramPlan = searchParams.get('plan') as PlanKey | null;
  const initialPlan: PlanKey = paramPlan && validPlans.includes(paramPlan) ? paramPlan : 'starter';

  const [plan, setPlan] = useState<PlanKey>(initialPlan);
  const [brandName, setBrandName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isPending, startTransition] = useTransition();
  const [globalError, setGlobalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function validateField(field: string, value: string | PlanKey) {
    setTouched(prev => ({ ...prev, [field]: true }));
    const data = {
      brandName: field === 'brandName' ? value : brandName,
      contactEmail: field === 'contactEmail' ? value : contactEmail,
      phone: field === 'phone' ? value : phone,
      plan: field === 'plan' ? value : plan,
    };

    // Treat empty phone as undefined for validation
    if (data.phone === '') {
      data.phone = undefined as any;
    }

    const parsed = applicationSchema.safeParse(data);
    if (!parsed.success) {
      const errs = parsed.error.flatten().fieldErrors;
      setFieldErrors(prev => ({ ...prev, [field]: (errs as any)[field] || [] }));
    } else {
      setFieldErrors(prev => ({ ...prev, [field]: [] }));
    }
  }

  function handlePlanToggle(newPlan: PlanKey) {
    setPlan(newPlan);
    validateField('plan', newPlan);
    // Update URL query param without navigation
    const url = new URL(window.location.href);
    url.searchParams.set('plan', newPlan);
    window.history.replaceState({}, '', url.toString());
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError('');

    // Full client-side validation
    const data = {
      brandName,
      contactEmail,
      phone: phone || undefined,
      plan,
    };

    const parsed = applicationSchema.safeParse(data);
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      setGlobalError('errFormFix');
      return;
    }

    setFieldErrors({});

    startTransition(async () => {
      const result = await submitApplication({
        brandName,
        contactEmail,
        phone: phone || undefined,
        plan,
      });

      if (result.success) {
        setIsSuccess(true);
      } else {
        setGlobalError(result.error);
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
      }
    });
  }

  const inputClasses = `w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-white placeholder:text-white/25 transition-all duration-200 focus:border-sky/50 focus:outline-none focus:ring-2 focus:ring-sky/20 ${isAr ? 'font-arabic text-end' : ''}`;
  const labelClasses = `mb-2 block text-sm font-medium text-white/70 ${isAr ? 'font-arabic' : ''}`;

  return (
    <AnimatePresence mode="wait">
      {isSuccess ? (
        <motion.div
          key="success"
          {...(prefersReduced ? {} : {
            initial: { opacity: 0, scale: 0.95 },
            animate: { opacity: 1, scale: 1 },
            transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
          })}
        >
          <ApplicationSuccess email={contactEmail} />
        </motion.div>
      ) : (
        <motion.div
          key="form"
          {...(prefersReduced ? {} : {
            initial: { opacity: 0, y: 24 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, scale: 0.95, y: -20 },
            transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
          })}
        >
          <div
            className="mx-auto max-w-lg rounded-2xl p-8 sm:p-10"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(24px)',
            }}
          >
            {/* Header */}
            <div className="mb-8 text-center">
              <h1 className={`text-3xl font-black text-white sm:text-4xl ${isAr ? 'font-arabic' : ''}`}>
                {t('heading')}
              </h1>
              <p className={`mt-3 text-sm text-white/50 ${isAr ? 'font-arabic' : ''}`}>
                {t('subheading')}
              </p>
            </div>

            {/* Global error */}
            {globalError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              >
                <AlertCircle size={16} strokeWidth={1.5} className="shrink-0" />
                <span className={isAr ? 'font-arabic' : ''}>{t(globalError as any)}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Plan toggle */}
              <div>
                <label className={labelClasses}>{t('selectedPlan')}</label>
                <div
                  className="inline-flex w-full items-center gap-1 rounded-xl p-1"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {validPlans.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePlanToggle(p)}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${p === plan
                        ? 'bg-gradient-cta text-navy shadow-glow-sky'
                        : 'text-white/40 hover:text-white/70'
                        } ${isAr ? 'font-arabic' : ''}`}
                    >
                      {/* @ts-ignore */}
                      {tPlans(p)}

                    </button>
                  ))}
                </div>
              </div>

              {/* Brand Name */}
              <div>
                <label htmlFor="brandName" className={labelClasses}>
                  {t('brandName')}
                </label>
                <input
                  id="brandName"
                  type="text"
                  required
                  minLength={2}
                  maxLength={60}
                  value={brandName}
                  onChange={(e) => {
                    setBrandName(e.target.value);
                    validateField('brandName', e.target.value);
                  }}
                  onBlur={(e) => validateField('brandName', e.target.value)}
                  placeholder={t('brandNamePlaceholder')}
                  className={inputClasses}
                  dir={isAr ? 'rtl' : 'ltr'}
                />
                {touched.brandName && fieldErrors.brandName && fieldErrors.brandName.length > 0 && (
                  <p className="mt-1.5 text-xs text-red-400">{t(fieldErrors.brandName[0] as any)}</p>
                )}
              </div>

              {/* Contact Email */}
              <div>
                <label htmlFor="contactEmail" className={labelClasses}>
                  {t('contactEmail')}
                </label>
                <input
                  id="contactEmail"
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => {
                    setContactEmail(e.target.value);
                    validateField('contactEmail', e.target.value);
                  }}
                  onBlur={(e) => validateField('contactEmail', e.target.value)}
                  placeholder={t('contactEmailPlaceholder')}
                  className={inputClasses}
                  dir="ltr"
                />
                {touched.contactEmail && fieldErrors.contactEmail && fieldErrors.contactEmail.length > 0 && (
                  <p className="mt-1.5 text-xs text-red-400">{t(fieldErrors.contactEmail[0] as any)}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className={labelClasses}>
                  {t('phone')} <span className="text-white/30">({t('phoneOptional')})</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    validateField('phone', e.target.value);
                  }}
                  onBlur={(e) => validateField('phone', e.target.value)}
                  placeholder={t('phonePlaceholder')}
                  className={inputClasses}
                  dir="ltr"
                />
                {touched.phone && fieldErrors.phone && fieldErrors.phone.length > 0 && (
                  <p className="mt-1.5 text-xs text-red-400">{t(fieldErrors.phone[0] as any)}</p>
                )}
              </div>

              {/* Submit */}
              <GlowButton
                type="submit"
                disabled={isPending}
                className='justify-center'
              >
                {isPending ? (
                  <>
                    <Loader2 size={18} strokeWidth={1.5} className="animate-spin" />
                    <span>{t('submitting')}</span>
                  </>
                ) : (
                  <>
                    <Send size={16} strokeWidth={1.5} />
                    <span>{t('submitButton')}</span>
                  </>
                )}
              </GlowButton>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
