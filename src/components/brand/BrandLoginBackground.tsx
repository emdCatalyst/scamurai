'use client';

import { motion } from 'framer-motion';
import { useLocale } from 'next-intl';

interface BrandLoginBackgroundProps {
  children: React.ReactNode;
}

export function BrandLoginBackground({ children }: BrandLoginBackgroundProps) {
  const locale = useLocale();
  const isAr = locale === 'ar';

  return (
    <div 
      className={cn(
        "relative min-h-screen flex items-center justify-center overflow-hidden p-6",
        isAr ? "font-arabic" : "font-sans"
      )}
      style={{ background: 'var(--brand-background)' }}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Login Card */}
      <motion.div 
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md bg-white/5 border border-white/10 rounded-[28px] p-8"
      >
        {children}
      </motion.div>
    </div>
  );
}

// Helper to handle class merging without external lib for simplicity here
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
