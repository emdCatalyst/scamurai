'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

interface GradientBadgeProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export default function GradientBadge({
  children,
  delay = 0,
  className = '',
}: GradientBadgeProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`inline-flex items-center gap-2 rounded-full border border-[var(--brand-border)] px-4 py-2 text-sm font-semibold text-[var(--brand-surface-fg)] ${className}`}
    >
      {children}
    </motion.div>
  );
}
