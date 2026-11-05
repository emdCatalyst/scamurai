'use client';

import { useEffect, useId, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, CircleCheck } from 'lucide-react';
import type { PlanTier, ServiceDefinition, ServiceKey } from '@/config/services';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { getService, isLiveService, listServices } from '@/lib/services/catalog';
import { ACCENTS } from '@/components/marketing/accents';
import { ButtonLink } from '@/components/marketing/primitives';
import ServiceIcon from '@/components/marketing/ServiceIcon';
import { getServicePath } from '@/components/marketing/services/links';
import ApplyCard from '@/components/apply/ApplyCard';

/** What happens after submitting, per kind of application (keys under `apply.success`). */
const NEXT_STEPS = {
  quoteSteps: ['quote', 'activate', 'brand'],
  interestSteps: ['saved', 'launch'],
} as const;

interface ApplicationSuccessProps {
  service: ServiceKey;
  plan?: PlanTier;
  contactName: string;
  contactEmail: string;
}

/**
 * Shown in place of the form once the application is stored. Live services
 * get the quote → payment → activation path; coming-soon services confirm
 * the early-access registration.
 */
export default function ApplicationSuccess({ service: serviceKey, plan, contactName, contactEmail }: ApplicationSuccessProps) {
  const t = useTranslations('apply.success');
  const tServices = useTranslations('services');
  const tPlans = useTranslations('plans');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();

  // The form, and the submit button that had focus, just unmounted: move focus to the outcome.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const service = getService(serviceKey);
  const serviceName = tServices(`${serviceKey}.name`);
  const isQuote = isLiveService(service) && plan !== undefined;
  const steps = isQuote ? 'quoteSteps' : 'interestSteps';

  return (
    <ApplyCard className="enter-fade-up">
      <section aria-labelledby={headingId} className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-mint/30 bg-mint/10 text-mint">
          <CircleCheck aria-hidden="true" focusable="false" size={32} strokeWidth={1.75} />
        </span>
        <h2
          ref={headingRef}
          id={headingId}
          tabIndex={-1}
          className="mt-6 text-balance text-2xl font-black text-white outline-none sm:text-3xl"
        >
          {t(isQuote ? 'titleQuote' : 'titleInterest')}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-white/75">
          {isQuote
            ? t('bodyQuote', { name: contactName, service: serviceName, plan: tPlans(plan), email: contactEmail })
            : t('bodyInterest', { name: contactName, service: serviceName, email: contactEmail })}
        </p>

        <div className="mx-auto mt-10 max-w-xl text-start">
          <h3 className="text-sm font-bold uppercase tracking-widest text-sky rtl:tracking-normal">{t('nextStepsTitle')}</h3>
          <ol role="list" className="mt-5 space-y-5">
            {NEXT_STEPS[steps].map((step, index) => (
              <li key={step} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky/30 bg-sky/10 text-sm font-bold text-sky"
                >
                  {index + 1}
                </span>
                <span>
                  <span className="block font-semibold text-white">{t(`${steps}.${step}.title`)}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-white/70">
                    {t(`${steps}.${step}.body`, { service: serviceName })}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm leading-relaxed text-white/65">{t('spamNote')}</p>
        </div>

        <OtherServices current={service} />

        <ButtonLink href="/" variant="secondary" className="mt-10">
          {t('backHome')}
        </ButtonLink>
      </section>
    </ApplyCard>
  );
}

/** Links to the rest of the catalog, so the visitor can keep exploring. */
function OtherServices({ current }: { current: ServiceDefinition }) {
  const t = useTranslations('apply.success');
  const tServices = useTranslations('services');
  const others = listServices().filter((service) => service.key !== current.key);
  if (others.length === 0) return null;

  return (
    <div className="mx-auto mt-10 max-w-xl border-t border-white/[0.06] pt-8 text-start">
      <h3 className="text-sm font-bold uppercase tracking-widest text-sky rtl:tracking-normal">{t('exploreServices')}</h3>
      <ul role="list" className="mt-4 grid gap-3 sm:grid-cols-2">
        {others.map((service) => {
          const accent = ACCENTS[service.accent];
          return (
            <li key={service.key}>
              <Link
                href={getServicePath(service)}
                className={cn(
                  'group flex items-center gap-3 rounded-[20px] border border-white/10 bg-charcoal p-4 transition-colors duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-deep',
                  accent.hoverBorder,
                  accent.ring
                )}
              >
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accent.tile)}>
                  <ServiceIcon name={service.icon} size={20} />
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-white">{tServices(`${service.key}.name`)}</span>
                <ArrowRight
                  aria-hidden="true"
                  focusable="false"
                  size={16}
                  className={cn('shrink-0 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5 text-white/70')}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
