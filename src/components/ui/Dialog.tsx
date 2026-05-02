'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, HelpCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info';
  isLoading?: boolean;
}

export default function Dialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  type = 'info',
  isLoading = false,
}: DialogProps) {
  const t = useTranslations('common.dialog');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isLoading && onClose()}
            className={`absolute inset-0 bg-[#0A1628]/40 backdrop-blur-sm ${!isLoading ? 'cursor-pointer' : 'cursor-wait'}`}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-md bg-[var(--brand-surface,#ffffff)] rounded-3xl shadow-2xl overflow-hidden border border-[var(--brand-border,rgba(0,0,0,0.05))]"
          >
            <div className="p-8">
              <div className="flex items-start gap-5">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                  style={{ 
                    backgroundColor: type === 'danger' ? 'var(--brand-danger, #ef4444)1a' : 'var(--brand-primary, #4fc5df)1a',
                    color: type === 'danger' ? 'var(--brand-danger, #ef4444)' : 'var(--brand-primary, #4fc5df)'
                  }}
                >
                  {type === 'danger' ? <AlertTriangle size={28} /> : <HelpCircle size={28} />}
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="text-xl font-bold text-[var(--brand-surface-fg,#0f172a)] mb-2 leading-tight">{title}</h3>
                  <p className="text-[var(--brand-surface-fg-muted,#64748b)] text-sm leading-relaxed">{description}</p>
                </div>
                <button 
                  onClick={onClose}
                  disabled={isLoading}
                  className="p-1 -mt-1 -me-1 transition-colors disabled:opacity-30 disabled:cursor-wait"
                  style={{ color: 'var(--brand-surface-fg-muted, #94a3b8)' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div 
              className="px-8 py-5 flex justify-end gap-3 border-t"
              style={{ 
                backgroundColor: 'var(--brand-background, #f8fafc)0d',
                borderColor: 'var(--brand-border, #f1f5f9)'
              }}
            >
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-5 py-2.5 text-sm font-bold transition-colors disabled:opacity-50 rounded-xl"
                style={{ color: 'var(--brand-surface-fg-muted, #64748b)' }}
              >
                {cancelText || t('cancel')}
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg`}
                style={{ 
                  backgroundColor: type === 'danger' ? 'var(--brand-danger, #ef4444)' : 'var(--brand-primary, #172b49)',
                  color: type === 'danger' ? 'var(--brand-danger-fg, #ffffff)' : 'var(--brand-primary-fg, #ffffff)'
                }}
              >
                {isLoading ? t('loading') : (confirmText || t('confirm'))}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
