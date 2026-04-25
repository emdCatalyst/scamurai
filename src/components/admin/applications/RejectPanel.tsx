'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Loader2, X } from 'lucide-react';
import { updateApplicationStatus } from '@/actions/updateApplicationStatus';
import { useToast } from '@/components/ui/Toast';

interface RejectPanelProps {
  applicationId: string;
  brandName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function RejectPanel({
  applicationId,
  brandName,
  onSuccess,
  onCancel,
}: RejectPanelProps) {
  const t = useTranslations('admin.applications.reject');
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setIsSubmitting(true);

    try {
      const result = await updateApplicationStatus({
        id: applicationId,
        status: 'rejected',
        rejectionNote: reason,
      });

      if (result.success) {
        onSuccess();
      } else {
        toast(result.error || t('error'), 'error');
      }
    } catch (err) {
      toast(t('error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-red-50 border border-red-100 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
          <AlertCircle size={16} />
          {t('title', { name: brandName })}
        </div>
        <button 
          onClick={onCancel}
          className="text-red-400 hover:text-red-600 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('placeholder')}
          className="w-full bg-white border border-red-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/5 rounded-lg p-3 text-sm min-h-[100px] outline-none transition-all"
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !reason.trim()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
            {t('confirm')}
          </button>
        </div>
      </form>
    </div>
  );
}
