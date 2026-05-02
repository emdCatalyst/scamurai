'use client';

import { useEffect, useState } from 'react';
import { useTranslations, useFormatter, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Calendar, 
  ShieldAlert,
  Loader2,
  Building2,
  Edit2,
  ShieldOff,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { CatalogAppRow } from '@/lib/queries/deliveryAppCatalog';
import { setCatalogAppStatus } from '@/actions/setCatalogAppStatus';
import { deleteCatalogApp } from '@/actions/deleteCatalogApp';
import { useToast } from '@/components/ui/Toast';
import Dialog from '@/components/ui/Dialog';
import { BrandsUsingAppList } from './BrandsUsingAppList';
import { DeliveryAppFormModal } from './DeliveryAppFormModal';

interface DeliveryAppDetailDrawerProps {
  app: CatalogAppRow;
  onClose: () => void;
}

export function DeliveryAppDetailDrawer({
  app,
  onClose,
}: DeliveryAppDetailDrawerProps) {
  const t = useTranslations('admin.deliveryApps');
  const format = useFormatter();
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { toast } = useToast();

  const [isUpdating, setIsUpdating] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const handleToggleStatus = async () => {
    setShowStatusConfirm(false);
    setIsUpdating(true);
    try {
      const result = await setCatalogAppStatus({
        id: app.id,
        isActive: !app.isActive,
      });
      if (result.success) {
        toast(t(`actions.success${app.isActive ? 'Deactivated' : 'Activated'}`), 'success');
        onClose();
      } else {
        toast(result.error || t('actions.error'), 'error');
      }
    } catch {
      toast(t('actions.error'), 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setIsUpdating(true);
    try {
      const result = await deleteCatalogApp({ id: app.id });
      if (result.success) {
        toast(t('actions.successDeleted'), 'success');
        onClose();
      } else {
        toast(result.error || t('actions.error'), 'error');
      }
    } catch {
      toast(t('actions.error'), 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
      />

      <motion.div
        initial={{ x: isAr ? '-100%' : '100%' }}
        animate={{ x: 0 }}
        exit={{ x: isAr ? '-100%' : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`fixed inset-y-0 ${isAr ? 'left-0' : 'right-0'} w-full max-w-lg bg-white shadow-2xl z-[70] flex flex-col overflow-hidden`}
      >
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <button 
              onClick={onClose}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 min-w-0">
              {app.logoUrl ? (
                <img
                  src={app.logoUrl}
                  alt={app.name}
                  className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 object-contain shadow-sm p-1"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-navy text-white flex items-center justify-center font-bold text-sm">
                  {app.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900 leading-none truncate">{app.name}</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${app.isActive ? "bg-[#5cbf8f]/10 text-[#5cbf8f] border-[#5cbf8f]/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                    {t(`table.status${app.isActive ? 'Active' : 'Inactive'}`)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className="p-2 text-slate-400 hover:text-sky hover:bg-sky/5 rounded-xl transition-all"
          >
            <Edit2 size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="space-y-10">
            <div className="grid grid-cols-2 gap-8">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <Building2 size={16} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">{t('table.usedBy')}</p>
                  <p className="text-sm font-bold text-navy">{app.brandCount} brands</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <Calendar size={16} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">{t('table.added')}</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {format.dateTime(new Date(app.createdAt), { dateStyle: 'medium' })}
                  </p>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            <BrandsUsingAppList brands={app.brandsUsing} />

            <div className="h-px bg-slate-100" />

            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2 text-red-500 font-bold text-sm uppercase tracking-widest">
                <ShieldAlert size={16} />
                {t('detail.dangerZone')}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setShowStatusConfirm(true)}
                  disabled={isUpdating}
                  className={`py-4 px-4 rounded-2xl text-sm font-bold transition-all border flex items-center justify-center gap-2 ${
                    app.isActive
                      ? "border-red-200 text-red-500 hover:bg-red-50"
                      : "border-[#5cbf8f]/20 text-[#5cbf8f] hover:bg-[#5cbf8f]/5"
                  } disabled:opacity-50`}
                >
                  {isUpdating ? <Loader2 size={18} className="animate-spin" /> : (app.isActive ? <ShieldOff size={18} /> : <ShieldCheck size={18} />)}
                  {app.isActive ? t("actions.deactivate") : t("actions.activate")}
                </button>

                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isUpdating || app.brandCount > 0}
                  title={app.brandCount > 0 ? t('actions.deleteDisabledHint') : ''}
                  className="py-4 px-4 rounded-2xl text-sm font-bold transition-all border border-red-100 text-red-400 hover:bg-red-600 hover:text-white hover:border-red-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-red-400 disabled:hover:border-red-100 flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  {t("actions.delete")}
                </button>
              </div>
              {app.brandCount > 0 && (
                <p className="text-[10px] text-slate-400 text-center font-medium italic">
                  {t('actions.deleteDisabledHint')}
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <Dialog
        isOpen={showStatusConfirm}
        onClose={() => setShowStatusConfirm(false)}
        onConfirm={handleToggleStatus}
        title={app.isActive ? t("actions.deactivate") : t("actions.activate")}
        description={app.isActive ? t("actions.confirmDeactivate") : t("actions.confirmActivate")}
        type={app.isActive ? "danger" : "info"}
        isLoading={isUpdating}
      />

      <Dialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={t("actions.delete")}
        description={t("actions.confirmDelete")}
        type="danger"
        isLoading={isUpdating}
      />

      <DeliveryAppFormModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        app={app}
      />
    </>
  );
}
