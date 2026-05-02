'use client';

import { useTranslations } from 'next-intl';
import { AlertCircle, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

export function BrandSuspensionNotice() {
  const t = useTranslations('suspended');

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col items-center text-center space-y-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-20 h-20 bg-[var(--brand-danger)]/10 rounded-3xl flex items-center justify-center text-[var(--brand-danger)] shadow-sm border border-[var(--brand-danger)]/20"
        >
          <AlertCircle size={40} strokeWidth={1.5} />
        </motion.div>
        
        <div className="space-y-3">
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-white tracking-tight"
          >
            {t('title')}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white/60 text-base leading-relaxed max-w-sm"
          >
            {t('message')}
          </motion.p>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="pt-4"
      >
        <a
          href="mailto:support@scamurai.com"
          className="w-full py-3 bg-[var(--brand-primary)] text-[var(--brand-primary-fg)] rounded-lg font-bold hover:brightness-110 transition-all shadow-lg flex items-center justify-center gap-3"
          style={{ 
            boxShadow: `0 0 20px ${withOpacity(derivePrimaryHex(), 0.3)}` 
          }}
        >
          <Mail size={18} />
          {t('contactSupport')}
        </a>
      </motion.div>
    </div>
  );
}

// Helper to get raw primary color for the glow effect
function derivePrimaryHex() {
  if (typeof window === 'undefined') return '#4fc5df';
  return getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#4fc5df';
}

function withOpacity(hex: string, opacity: number): string {
  if (!hex.startsWith('#')) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

