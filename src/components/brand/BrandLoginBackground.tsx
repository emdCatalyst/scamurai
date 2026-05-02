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
      style={{ 
        background: 'linear-gradient(135deg, var(--brand-background) 0%, var(--brand-background-active) 100%)' 
      }}
      dir={isAr ? 'rtl' : 'ltr'}
    >
      {/* Background glow orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.2, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full blur-[120px] animate-hero-glow-pulse"
          style={{ 
            background: 'radial-gradient(circle, var(--brand-primary) 0%, transparent 70%)'
          }}
        />
      </div>

      {/* Login Card */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md bg-white/5 backdrop-blur-[24px] border border-white/10 rounded-2xl p-8 shadow-2xl"
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
