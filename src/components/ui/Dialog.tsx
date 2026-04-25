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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-sky/10 text-sky'
                }`}>
                  {type === 'danger' ? <AlertTriangle size={24} /> : <HelpCircle size={24} />}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors disabled:opacity-50"
              >
                {cancelText || t('cancel')}
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
                  type === 'danger' 
                    ? 'bg-red-500 text-white hover:bg-red-600 shadow-glow-red' 
                    : 'bg-navy text-white hover:bg-[#1e293b] shadow-glow-navy'
                }`}
              >
                {isLoading ? t('loading') : (confirmText || t('confirm'))}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
