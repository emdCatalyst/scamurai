'use client';

import { useState } from 'react';
import { useClerk } from '@clerk/nextjs';
import { useTranslations, useLocale } from 'next-intl';
import { Loader2, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormValues } from '@/lib/validations/auth';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface BrandLoginFormProps {
  brandSlug: string;
}

export function BrandLoginForm({ brandSlug }: BrandLoginFormProps) {
  const { client, setActive } = useClerk();
  const t = useTranslations('brand.login');
  const locale = useLocale();
  const isAr = locale === 'ar';
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    }
  });

  const onSubmit = async (data: LoginFormValues) => {
    if (!client) {
      setServerError(t('initializing'));
      return;
    }

    setServerError('');
    setIsLoading(true);

    try {
      const result = await client.signIn.create({
        identifier: data.email,
        password: data.password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        window.location.reload();
      } else {
        console.warn('[BrandLoginForm] Sign in status not complete:', result.status);
        setServerError(`Login incomplete. Status: ${result.status}`);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('[BrandLoginForm] Clerk returned an error:', err);

      const clerkErr = err as {
        errors?: { code?: string; longMessage?: string }[];
        longMessage?: string;
        message?: string;
      };
      const clerkErrorCode = clerkErr.errors?.[0]?.code;

      if (clerkErrorCode === 'session_exists') {
        window.location.reload();
        return;
      }

      const longMessage = clerkErr.errors?.[0]?.longMessage || clerkErr.longMessage || clerkErr.message;
      const looksBannedOrInactive =
        clerkErrorCode === 'user_locked' ||
        (typeof longMessage === 'string' && /deactivat|suspend|disabled|banned|locked/i.test(longMessage));

      if (looksBannedOrInactive) {
        setServerError(t('errors.inactive'));
      } else if (clerkErrorCode === 'form_identifier_not_found' || clerkErrorCode === 'form_password_incorrect') {
        setServerError(t('errors.invalid'));
      } else if (clerkErrorCode === 'too_many_requests') {
        setServerError(t('errors.too_many_requests'));
      } else {
        setServerError(longMessage || t('errors.invalid'));
      }
      
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4 }}
      >
        <input
          type="email"
          {...register('email')}
          placeholder={t('email')}
          disabled={isLoading}
          className={cn(
            "w-full bg-white/5 border rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-1 transition-colors disabled:opacity-50",
            errors.email ? "border-[var(--brand-danger)]/50 focus:border-[var(--brand-danger)] focus:ring-[var(--brand-danger)]/50" : "border-white/10 focus:border-[var(--brand-primary)]/50 focus:ring-[var(--brand-primary)]/50",
            isAr && "text-right"
          )}
        />
        {errors.email?.message && (
          <p className="text-[var(--brand-danger)] text-xs mt-1.5 ml-1">
            {t(errors.email.message as any)}
          </p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
            placeholder={t('password')}
            disabled={isLoading}
            className={cn(
              "w-full bg-white/5 border rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-1 transition-colors disabled:opacity-50",
              errors.password ? "border-[var(--brand-danger)]/50 focus:border-[var(--brand-danger)] focus:ring-[var(--brand-danger)]/50" : "border-white/10 focus:border-[var(--brand-primary)]/50 focus:ring-[var(--brand-primary)]/50",
              isAr ? "pr-4 pl-12 text-right" : "pl-4 pr-12"
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isLoading}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors disabled:opacity-50",
              isAr ? "left-4" : "right-4"
            )}
          >
            {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
          </button>
        </div>
        {errors.password?.message && (
          <p className="text-[var(--brand-danger)] text-xs mt-1.5 ml-1">
            {t(errors.password.message as any)}
          </p>
        )}
        
        <div className={cn("flex mt-2 px-1", isAr ? "justify-start" : "justify-end")}>
          <button 
            type="button"
            className="text-xs font-semibold text-[var(--brand-primary)] hover:underline disabled:opacity-50"
            disabled={isLoading}
          >
            {t('forgotPassword')}
          </button>
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        type="submit"
        disabled={isLoading}
        className="w-full relative flex justify-center items-center h-12 bg-[var(--brand-primary)] rounded-lg text-[var(--brand-primary-fg)] font-bold  hover:brightness-110 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
        style={{ 
          boxShadow: `0 0 20px ${withOpacity(derivePrimaryHex(), 0.3)}` 
        }}
      >
        {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
          <div className="flex items-center gap-2">
            <LogIn size={18} className={isAr ? "rotate-180" : ""} />
            {t('signIn')}
          </div>
        )}
      </motion.button>

      {serverError && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[var(--brand-danger)] text-sm text-center mt-4 bg-[var(--brand-danger)]/10 py-2 px-3 rounded-lg border border-[var(--brand-danger)]/20 flex items-start gap-2"
        >
          <AlertCircle className="shrink-0 mt-0.5" size={16} />
          <span className="text-left">{serverError}</span>
        </motion.div>
      )}


    </form>
  );
}

// Helper to get raw primary color for the glow effect
// Since we can't easily read CSS variables in SSR/Static styles
// We'll rely on the fact that BrandSwitch/Layout injected it
function derivePrimaryHex() {
  if (typeof window === 'undefined') return '#4fc5df';
  return getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#4fc5df';
}

function withOpacity(hex: string, opacity: number): string {
  // Simple check for hex
  if (!hex.startsWith('#')) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

