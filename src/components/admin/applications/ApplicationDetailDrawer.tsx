'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTranslations, useFormatter, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  X, 
  Mail, 
  Phone, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  FileCheck,
  Loader2,
  ExternalLink
} from 'lucide-react';
import ApplicationStatusBadge, { type ApplicationStatus } from './ApplicationStatusBadge';
import StatusTimeline from './StatusTimeline';
import RejectPanel from './RejectPanel';
import { updateApplicationStatus } from '@/actions/updateApplicationStatus';
import { approveApplication } from '@/actions/approveApplication';
import { useToast } from '@/components/ui/Toast';
import Dialog from '@/components/ui/Dialog';

interface ApplicationDetailDrawerProps {
  application: any;
  onClose: () => void;
}

export default function ApplicationDetailDrawer({
  application,
  onClose,
}: ApplicationDetailDrawerProps) {
  const t = useTranslations('admin.applications.detail');
  const tActions = useTranslations('admin.applications.actions');
  const format = useFormatter();
  const locale = useLocale();
  const isAr = locale === 'ar';
  const router = useRouter();
  const { toast } = useToast();

  const [isRejecting, setIsRejecting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Dialog states
  const [showQuotedConfirm, setShowQuotedConfirm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  // Consistent 'now' for relative time to avoid hydration mismatch and next-intl errors
  const now = useMemo(() => new Date(), []);

  // Close on ESC and manage body overflow
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    // Prevent scrolling behind drawer
    document.body.style.overflow = 'hidden';
    
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const status = application.status as ApplicationStatus;

  // Mock timeline events based on creation/update times
  const events = [
    { 
      status: 'pending' as const, 
      timestamp: application.createdAt, 
      actor: 'System' 
    }
  ];
  if (application.status !== 'pending') {
    events.push({
      status: application.status as any,
      timestamp: application.updatedAt,
      actor: 'Master Admin',
      note: application.rejectionNote
    });
  }

  const handleMarkAsQuoted = async () => {
    setShowQuotedConfirm(false);
    setIsUpdating(true);
    try {
      const result = await updateApplicationStatus({
        id: application.id,
        status: 'quoted',
      });
      if (result.success) {
        toast(tActions('successQuoted'), 'success');
        router.refresh();
        onClose();
      } else {
        toast(result.error, 'error');
      }
    } catch (err) {
      toast(tActions('error'), 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleApprove = async () => {
    setShowApproveConfirm(false);
    setIsUpdating(true);
    try {
      const result = await approveApplication(application.id);
      if (result.success) {
        toast(tActions('successApproved'), 'success');
        router.refresh();
        onClose();
      } else {
        toast(result.error, 'error');
      }
    } catch (err) {
      toast(tActions('error'), 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: isAr ? '-100%' : '100%' }}
        animate={{ x: 0 }}
        exit={{ x: isAr ? '-100%' : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`fixed inset-y-0 ${isAr ? 'left-0' : 'right-0'} w-full max-w-lg bg-white shadow-2xl z-[70] flex flex-col overflow-hidden`}
      >
        {/* Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{application.brandName}</h2>
              <ApplicationStatusBadge status={status} className="mt-0.5" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="space-y-10">
            {/* Details Grid */}
            <div className="grid grid-cols-1 gap-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">{t('email')}</p>
                  <p className="text-sm font-semibold text-slate-700">{application.contactEmail}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">{t('phone')}</p>
                  <p className="text-sm font-semibold text-slate-700">{application.phone || t('notProvided')}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <ExternalLink size={20} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">{t('plan')}</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-navy text-white mt-1">
                    {application.plan}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">{t('submitted')}</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {format.dateTime(new Date(application.createdAt), { dateStyle: 'long', timeStyle: 'short' })}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{format.relativeTime(new Date(application.createdAt), { now })}</p>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Status Timeline */}
            <StatusTimeline events={events} />

            {/* Rejection Note if exists */}
            {application.status === 'rejected' && application.rejectionNote && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-5">
                <div className="flex items-center gap-2 text-red-700 font-bold text-sm mb-2">
                  <XCircle size={16} />
                  {t('rejectionTitle')}
                </div>
                <p className="text-sm text-red-600 leading-relaxed italic">
                  "{application.rejectionNote}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0">
          {isRejecting ? (
            <RejectPanel
              applicationId={application.id}
              brandName={application.brandName}
              onSuccess={() => {
                setIsRejecting(false);
                toast(tActions('successRejected'), 'success');
                router.refresh();
                onClose();
              }}
              onCancel={() => setIsRejecting(false)}
            />
          ) : (
            <div className="space-y-3">
              {status === 'pending' && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowQuotedConfirm(true)}
                    disabled={isUpdating}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 hover:border-sky/50 hover:text-sky text-slate-700 font-bold rounded-xl transition-all disabled:opacity-50"
                  >
                    {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <FileCheck size={18} />}
                    {tActions('markAsQuoted')}
                  </button>
                  <button
                    onClick={() => setIsRejecting(true)}
                    disabled={isUpdating}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 hover:border-red-500/50 hover:text-red-500 text-slate-700 font-bold rounded-xl transition-all disabled:opacity-50"
                  >
                    <XCircle size={18} />
                    {tActions('reject')}
                  </button>
                </div>
              )}

              {status === 'quoted' && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowApproveConfirm(true)}
                    disabled={isUpdating}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-navy text-white font-bold rounded-xl shadow-glow-navy hover:bg-[#1e293b] transition-all disabled:opacity-50"
                  >
                    {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                    {tActions('approve')}
                  </button>
                  <button
                    onClick={() => setIsRejecting(true)}
                    disabled={isUpdating}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-200 hover:border-red-500/50 hover:text-red-500 text-slate-700 font-bold rounded-xl transition-all disabled:opacity-50"
                  >
                    <XCircle size={18} />
                    {tActions('reject')}
                  </button>
                </div>
              )}

              {['approved', 'rejected'].includes(status) && (
                <p className="text-center text-sm text-slate-400 font-medium py-2">
                  {t('noFurtherActions')}
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Confirmation Dialogs */}
      <Dialog
        isOpen={showQuotedConfirm}
        onClose={() => setShowQuotedConfirm(false)}
        onConfirm={handleMarkAsQuoted}
        title={tActions('markAsQuoted')}
        description={tActions('confirmQuoted')}
        isLoading={isUpdating}
      />
      <Dialog
        isOpen={showApproveConfirm}
        onClose={() => setShowApproveConfirm(false)}
        onConfirm={handleApprove}
        title={tActions('approve')}
        description={tActions('confirmApprove')}
        type="danger"
        isLoading={isUpdating}
      />
    </>
  );
}
