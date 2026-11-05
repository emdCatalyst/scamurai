'use client';

import { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, HelpCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

const subscribeToNothing = () => () => {};

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
  // Portals need document.body, so render only on the client (no hydration mismatch).
  const mounted = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // Focus moves into the dialog on open and back to whatever opened it on close.
  useEffect(() => {
    if (!isOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => cancelRef.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      opener?.focus();
    };
  }, [isOpen]);

  // Keyboard: Tab stays inside, Escape cancels. Handled in the capture phase and
  // stopped there, so a drawer underneath neither wraps the Tab nor closes.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        event.preventDefault();
        if (!isLoading) onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      event.stopPropagation();

      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!first || !last) {
        event.preventDefault();
      } else if (!panelRef.current.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, isLoading, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
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
            className={`absolute inset-0 bg-[#0B0B0B]/40 backdrop-blur-sm ${!isLoading ? 'cursor-pointer' : 'cursor-wait'}`}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
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
                    backgroundColor: type === 'danger' ? 'var(--brand-danger, #ef4444)1a' : 'var(--brand-primary, #FF5B3A)1a',
                    color: type === 'danger' ? 'var(--brand-danger, #ef4444)' : 'var(--brand-primary, #FF5B3A)'
                  }}
                >
                  {type === 'danger' ? <AlertTriangle size={28} /> : <HelpCircle size={28} />}
                </div>
                <div className="flex-1 pt-1">
                  <h3 id={titleId} className="text-xl font-bold text-[var(--brand-surface-fg,#0f172a)] mb-2 leading-tight">{title}</h3>
                  <p id={descriptionId} className="text-[var(--brand-surface-fg-muted,#64748b)] text-sm leading-relaxed">{description}</p>
                </div>
                <button
                  type="button"
                  aria-label={cancelText || t('cancel')}
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
                ref={cancelRef}
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-5 py-2.5 text-sm font-bold transition-colors disabled:opacity-50 rounded-xl"
                style={{ color: 'var(--brand-surface-fg-muted, #64748b)' }}
              >
                {cancelText || t('cancel')}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-lg`}
                style={{ 
                  backgroundColor: type === 'danger' ? 'var(--brand-danger, #ef4444)' : 'var(--brand-primary, #0B0B0B)',
                  color: type === 'danger' ? 'var(--brand-danger-fg, #ffffff)' : 'var(--brand-primary-fg, #ffffff)'
                }}
              >
                {isLoading ? t('loading') : (confirmText || t('confirm'))}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
