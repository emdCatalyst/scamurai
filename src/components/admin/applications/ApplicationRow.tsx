'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useFormatter } from 'next-intl';
import { useRouter } from 'next/navigation';
import { 
  MoreHorizontal, 
  CheckCircle2, 
  XCircle, 
  FileCheck, 
  ChevronRight,
  Phone,
  Mail,
  Calendar,
  Loader2
} from 'lucide-react';
import ApplicationStatusBadge, { type ApplicationStatus } from './ApplicationStatusBadge';
import RejectPanel from './RejectPanel';
import { updateApplicationStatus } from '@/actions/updateApplicationStatus';
import { approveApplication } from '@/actions/approveApplication';
import { useToast } from '@/components/ui/Toast';
import Dialog from '@/components/ui/Dialog';

interface ApplicationRowProps {
  application: {
    id: string;
    brandName: string;
    contactEmail: string;
    phone: string | null;
    plan: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  };
  onDetailOpen: (app: any) => void;
}

export default function ApplicationRow({ application, onDetailOpen }: ApplicationRowProps) {
  const t = useTranslations('admin.applications.table');
  const tActions = useTranslations('admin.applications.actions');
  const format = useFormatter();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isRejecting, setIsRejecting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Dialog states
  const [showQuotedConfirm, setShowQuotedConfirm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);

  // Consistent 'now' for relative time
  const now = useMemo(() => new Date(), []);

  const status = application.status as ApplicationStatus;

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
      } else {
        toast(result.error, 'error');
      }
    } catch (err) {
      toast(tActions('error'), 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRejectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRejecting(true);
  };

  return (
    <>
      <tr 
        onClick={() => onDetailOpen(application)}
        className="group hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100 last:border-0"
      >
        <td className="py-4 px-4">
          <div className="font-bold text-slate-900 group-hover:text-sky transition-colors">
            {application.brandName}
          </div>
        </td>
        <td className="py-4 px-4">
          <div className="text-sm text-slate-500 flex items-center gap-1.5">
            <Mail size={14} className="text-slate-300" />
            {application.contactEmail}
          </div>
        </td>
        <td className="py-4 px-4">
          <div className="text-sm text-slate-500 flex items-center gap-1.5">
            <Phone size={14} className="text-slate-300" />
            {application.phone || <span className="text-slate-300 italic text-xs">{t('noPhone')}</span>}
          </div>
        </td>
        <td className="py-4 px-4">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
            {application.plan}
          </span>
        </td>
        <td className="py-4 px-4">
          <div className="text-sm text-slate-500 flex items-center gap-1.5" title={format.dateTime(new Date(application.createdAt), { dateStyle: 'full', timeStyle: 'short' })}>
            <Calendar size={14} className="text-slate-300" />
            {format.relativeTime(new Date(application.createdAt), { now })}
          </div>
        </td>
        <td className="py-4 px-4">
          <ApplicationStatusBadge status={status} />
        </td>
        <td className="py-4 px-4 text-right">
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            {isUpdating ? (
              <Loader2 size={18} className="animate-spin text-sky" />
            ) : (
              <>
                {status === 'pending' && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowQuotedConfirm(true); }}
                      className="p-2 text-slate-400 hover:text-sky hover:bg-sky-50 rounded-lg transition-all"
                      title={tActions('markAsQuoted')}
                    >
                      <FileCheck size={18} />
                    </button>
                    <button
                      onClick={handleRejectClick}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title={tActions('reject')}
                    >
                      <XCircle size={18} />
                    </button>
                  </>
                )}
                {status === 'quoted' && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowApproveConfirm(true); }}
                      className="p-2 text-slate-400 hover:text-navy hover:bg-slate-100 rounded-lg transition-all"
                      title={tActions('approve')}
                    >
                      <CheckCircle2 size={18} />
                    </button>
                    <button
                      onClick={handleRejectClick}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title={tActions('reject')}
                    >
                      <XCircle size={18} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => onDetailOpen(application)}
                  className="p-2 text-slate-400 hover:text-navy hover:bg-slate-100 rounded-lg transition-all"
                >
                  <ChevronRight size={18} />
                </button>
              </>
            )}
          </div>
        </td>
      </tr>
      {isRejecting && (
        <tr>
          <td colSpan={7} className="p-0">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
              <RejectPanel
                applicationId={application.id}
                brandName={application.brandName}
                onSuccess={() => {
                   setIsRejecting(false);
                   toast(tActions('successRejected'), 'success');
                   router.refresh();
                }}
                onCancel={() => setIsRejecting(false)}
              />
            </div>
          </td>
        </tr>
      )}

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
