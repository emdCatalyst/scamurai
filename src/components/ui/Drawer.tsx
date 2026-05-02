'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  canClose?: boolean;
}

export default function Drawer({
  isOpen,
  onClose,
  title,
  children,
  canClose = true,
}: DrawerProps) {
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
          className="fixed inset-0 z-[100]"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => canClose && onClose()}
            className={`absolute inset-0 bg-[#0A1628]/40 backdrop-blur-sm ${canClose ? 'cursor-pointer' : 'cursor-wait'}`}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 h-full w-full max-w-lg bg-[var(--brand-background,var(--brand-surface,#f2f2f2))] shadow-2xl overflow-hidden flex flex-col border-s border-[var(--brand-border,rgba(0,0,0,0.1))] shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.2)]"
            style={{ 
              backgroundColor: 'var(--brand-surface, #f2f2f2)',
            }}
          >
            <div 
              className="px-6 py-4 border-b flex items-center justify-between"
              style={{ 
                backgroundColor: 'var(--brand-surface, #ffffff)',
                borderColor: 'var(--brand-border, #f1f5f9)'
              }}
            >
              <div className="flex-1 min-w-0">{title}</div>
              <button
                onClick={onClose}
                disabled={!canClose}
                className="p-2 -mr-2 transition-colors disabled:opacity-30 disabled:cursor-wait"
                style={{ color: 'var(--brand-surface-fg-muted, #94a3b8)' }}
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
