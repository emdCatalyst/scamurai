'use client';

import { useCallback, useId, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { Info, X, XCircle } from 'lucide-react';
import { getAllowedTransitions } from '@/lib/applications/status';
import { getService, isLiveService } from '@/lib/services/catalog';
import type { ApplicationListItem } from '@/lib/queries/applications';
import { useToast } from '@/components/ui/Toast';
import ApplicantDetails from './ApplicantDetails';
import ApplicationStatusBadge from './ApplicationStatusBadge';
import RejectAction from './RejectAction';
import ServiceChip from './ServiceChip';
import StatusTimeline from './StatusTimeline';
import { isStaleDataError, type ReviewActionError, type ReviewStepProps, type ToastTone } from './actionResult';
import { NEXT_STEPS, isNextStep } from './steps';
import { useModalDrawer } from './useModalDrawer';

interface ApplicationDetailDrawerProps {
  application: ApplicationListItem;
  onClose: () => void;
}

/**
 * Review panel for one application. The actions offered come only from
 * getAllowedTransitions(status, service), the same rule the server actions
 * enforce, so the UI and the server can never disagree.
 */
export default function ApplicationDetailDrawer({ application, onClose }: ApplicationDetailDrawerProps) {
  const t = useTranslations('admin.applications');
  const tServices = useTranslations('services');
  const isRtl = useLocale() === 'ar';
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const { toast } = useToast();
  const titleId = useId();
  const nextStepId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useModalDrawer({ panelRef, initialFocusRef: closeButtonRef, onClose });

  const service = getService(application.service);
  const transitions = getAllowedTransitions(application.status, service);
  const nextSteps = transitions.filter(isNextStep);
  const canReject = transitions.includes('rejected');

  const onCompleted = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      toast(message, tone);
      router.refresh();
      onClose();
    },
    [onClose, router, toast]
  );

  const onFailed = useCallback(
    (error: ReviewActionError) => {
      toast(t(`errors.${error}`), 'error');
      // Someone else changed the application: show its current state.
      if (isStaleDataError(error)) router.refresh();
    },
    [router, t, toast]
  );

  const stepProps: ReviewStepProps = { application, onCompleted, onFailed };
  const offscreen = isRtl ? '-100%' : '100%';

  return (
    <>
      <motion.div
        aria-hidden="true"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.2 }}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
      />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={{ x: offscreen }}
        animate={{ x: 0 }}
        exit={{ x: offscreen }}
        transition={reduceMotion ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 end-0 w-full max-w-lg bg-white shadow-2xl z-[70] flex flex-col overflow-hidden"
      >
        <header className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold text-slate-900 break-words">
              {application.brandName}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <ApplicationStatusBadge status={application.status} />
              <ServiceChip service={application.service} />
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={t('detail.close')}
            className="p-2 -me-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain p-6 md:p-8 space-y-10">
          {nextSteps.length > 0 && (
            <section aria-labelledby={nextStepId} className="space-y-3">
              <h3 id={nextStepId} className="text-xs font-bold uppercase tracking-wider text-sky-800">
                {t('steps.title')}
              </h3>
              {nextSteps.map((status) => {
                const Step = NEXT_STEPS[status];
                return <Step key={status} {...stepProps} />;
              })}
            </section>
          )}

          {!isLiveService(service) && transitions.length > 0 && (
            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <Info size={18} aria-hidden="true" className="shrink-0 mt-0.5 text-amber-700" />
              <div>
                <p className="text-sm font-bold text-amber-900">{t('detail.interestTitle')}</p>
                <p className="mt-1 text-sm text-amber-900">
                  {t('detail.interestNote', { service: tServices(`${service.key}.name`) })}
                </p>
              </div>
            </div>
          )}

          <ApplicantDetails application={application} />

          <StatusTimeline application={application} />

          {application.rejectionNote && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <p className="flex items-center gap-2 text-red-800 font-bold text-sm mb-2">
                <XCircle size={16} aria-hidden="true" />
                {t('detail.rejectionTitle')}
              </p>
              <p className="text-sm text-red-800 leading-relaxed whitespace-pre-line" dir="auto">
                {application.rejectionNote}
              </p>
            </div>
          )}
        </div>

        {(canReject || transitions.length === 0) && (
          <footer className="p-6 border-t border-slate-100 bg-slate-50 shrink-0">
            {canReject ? (
              <RejectAction {...stepProps} />
            ) : (
              <p className="text-center text-sm text-slate-600 font-medium">{t('detail.noFurtherActions')}</p>
            )}
          </footer>
        )}
      </motion.div>
    </>
  );
}
