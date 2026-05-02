'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CatalogLogoUpload from './CatalogLogoUpload';
import { createCatalogApp } from '@/actions/createCatalogApp';
import { updateCatalogApp } from '@/actions/updateCatalogApp';
import { useToast } from '@/components/ui/Toast';

interface DeliveryAppFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  app?: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
}

export function DeliveryAppFormModal({ isOpen, onClose, app }: DeliveryAppFormModalProps) {
  const t = useTranslations('admin.deliveryApps.form');
  const { toast } = useToast();
  const [name, setName] = useState(app?.name || '');
  const [logoUrl, setLogoUrl] = useState<string | null>(app?.logoUrl || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!app;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || name.length < 2) {
      setError(t('errorNameMin'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Client-side optimization: Skip if no changes
      if (isEdit && name === app.name && logoUrl === app.logoUrl) {
        onClose();
        return;
      }

      const result = isEdit
        ? await updateCatalogApp({ id: app.id, name, logoUrl: logoUrl ?? null })
        : await createCatalogApp({ name, logoUrl: logoUrl || undefined });

      if (result.success) {
        toast(isEdit ? t('successUpdated') : t('successCreated'), 'success');
        onClose();
      } else {
        setError(result.error || t('errorGeneral'));
      }
    } catch {
      setError(t('errorGeneral'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">
                {isEdit ? t('editTitle') : t('createTitle')}
              </h3>
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ps-1">
                  {t('fieldName')}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('namePlaceholder')}
                  className="w-full px-4 py-3 bg-slate-50 border-transparent focus:bg-white focus:border-sky/50 focus:ring-4 focus:ring-sky/5 rounded-2xl text-sm transition-all outline-none font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ps-1">
                  {t('fieldLogo')}
                </label>
                <CatalogLogoUpload
                  logoUrl={logoUrl}
                  onUpload={setLogoUrl}
                  onRemove={() => setLogoUrl(null)}
                  appId={app?.id}
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium">
                  {error}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-navy text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-glow-navy disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      {t('submitting')}
                    </>
                  ) : (
                    isEdit ? t('btnUpdate') : t('btnCreate')
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
