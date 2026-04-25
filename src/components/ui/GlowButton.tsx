'use client';

import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface GlowButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'ghost';
  className?: string;
}

export default function GlowButton({
  children,
  variant = 'primary',
  className = '',
  ...props
}: GlowButtonProps) {
  if (variant === 'ghost') {
    return (
      <button
        {...props}
        className={`inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-base font-medium text-white transition-all duration-200 hover:border-white/50 hover:bg-white/5 ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      {...props}
      className={`inline-flex items-center gap-2 rounded-full bg-gradient-cta px-8 py-4 text-lg font-semibold text-navy transition-all duration-200 hover:brightness-108 hover:[box-shadow:var(--shadow-glow-sky)] active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  );
}
