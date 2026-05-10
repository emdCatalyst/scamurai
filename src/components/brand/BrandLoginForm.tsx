'use client';

import { useState } from 'react';
import { useClerk } from '@clerk/nextjs';
import { useTranslations, useLocale } from 'next-intl';
import {
  Loader2,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  loginSchema,
  forgotPasswordRequestSchema,
  forgotPasswordVerifySchema,
  type LoginFormValues,
  type ForgotPasswordRequestValues,
  type ForgotPasswordVerifyValues,
} from '@/lib/validations/auth';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface BrandLoginFormProps {
  brandSlug: string;
}

type Mode = 'login' | 'request' | 'verify';

type ClerkErrorShape = {
  errors?: { code?: string; longMessage?: string; message?: string }[];
  longMessage?: string;
  message?: string;
};

export function BrandLoginForm({ brandSlug }: BrandLoginFormProps) {
  const { client, setActive } = useClerk();
  const t = useTranslations('brand.login');
  const locale = useLocale();
  const isAr = locale === 'ar';

  const [mode, setMode] = useState<Mode>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [serverError, setServerError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const switchMode = (next: Mode) => {
    setServerError('');
    setInfoMessage('');
    setMode(next);
  };

  // ---------------------------------------------------------------------------
  // LOGIN MODE
  // ---------------------------------------------------------------------------
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  });

  const onLoginSubmit = async (data: LoginFormValues) => {
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
      const clerkErr = err as ClerkErrorShape;
      const code = clerkErr.errors?.[0]?.code;

      if (code === 'session_exists') {
        window.location.reload();
        return;
      }

      const longMessage = clerkErr.errors?.[0]?.longMessage || clerkErr.longMessage || clerkErr.message;
      const looksBannedOrInactive =
        code === 'user_locked' ||
        (typeof longMessage === 'string' && /deactivat|suspend|disabled|banned|locked/i.test(longMessage));

      if (looksBannedOrInactive) {
        setServerError(t('errors.inactive'));
      } else if (code === 'form_identifier_not_found' || code === 'form_password_incorrect') {
        setServerError(t('errors.invalid'));
      } else if (code === 'too_many_requests') {
        setServerError(t('errors.too_many_requests'));
      } else {
        setServerError(longMessage || t('errors.invalid'));
      }
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // FORGOT-PASSWORD: REQUEST CODE
  // ---------------------------------------------------------------------------
  const requestForm = useForm<ForgotPasswordRequestValues>({
    resolver: zodResolver(forgotPasswordRequestSchema),
    mode: 'onChange',
    defaultValues: { email: '' },
  });

  const onRequestSubmit = async (data: ForgotPasswordRequestValues) => {
    if (!client) {
      setServerError(t('initializing'));
      return;
    }
    setServerError('');
    setInfoMessage('');
    try {
      await client.signIn.create({
        strategy: 'reset_password_email_code',
        identifier: data.email,
      });
      setResetEmail(data.email);
      verifyForm.reset({ code: '', password: '', confirmPassword: '' });
      setMode('verify');
    } catch (err) {
      setServerError(mapForgotError(err));
    }
  };

  // ---------------------------------------------------------------------------
  // FORGOT-PASSWORD: VERIFY CODE + NEW PASSWORD
  // ---------------------------------------------------------------------------
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const verifyForm = useForm<ForgotPasswordVerifyValues>({
    resolver: zodResolver(forgotPasswordVerifySchema),
    mode: 'onChange',
    defaultValues: { code: '', password: '', confirmPassword: '' },
  });

  const onVerifySubmit = async (data: ForgotPasswordVerifyValues) => {
    if (!client) {
      setServerError(t('initializing'));
      return;
    }
    setServerError('');
    setInfoMessage('');
    try {
      const result = await client.signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: data.code,
        password: data.password,
      });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        window.location.reload();
      } else {
        // e.g. needs_second_factor — not currently expected on this app
        setServerError(t('forgot.errors.generic'));
      }
    } catch (err) {
      setServerError(mapForgotError(err));
    }
  };

  const onResendCode = async () => {
    if (!client || !resetEmail) return;
    setServerError('');
    setInfoMessage('');
    setIsResending(true);
    try {
      await client.signIn.create({
        strategy: 'reset_password_email_code',
        identifier: resetEmail,
      });
      setInfoMessage(t('forgot.resentToast'));
    } catch (err) {
      setServerError(mapForgotError(err));
    } finally {
      setIsResending(false);
    }
  };

  // ---------------------------------------------------------------------------
  const mapForgotError = (err: unknown): string => {
    const clerkErr = err as ClerkErrorShape;
    const code = clerkErr.errors?.[0]?.code;
    const longMessage = clerkErr.errors?.[0]?.longMessage;
    if (code === 'form_identifier_not_found') return t('forgot.errors.emailNotFound');
    if (
      code === 'form_code_incorrect' ||
      code === 'verification_failed' ||
      code === 'form_param_format_invalid'
    ) {
      return t('forgot.errors.codeIncorrect');
    }
    if (code === 'form_password_pwned') return t('forgot.errors.passwordPwned');
    if (code === 'too_many_requests') return t('errors.too_many_requests');
    return longMessage || clerkErr.message || t('forgot.errors.generic');
  };

  // ===========================================================================

  if (mode === 'login') {
    const { register, handleSubmit, formState: { errors } } = loginForm;
    return (
      <form onSubmit={handleSubmit(onLoginSubmit)} className="space-y-5">
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
              'w-full bg-white/5 border rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-1 transition-colors disabled:opacity-50',
              errors.email
                ? 'border-[var(--brand-danger)]/50 focus:border-[var(--brand-danger)] focus:ring-[var(--brand-danger)]/50'
                : 'border-white/10 focus:border-[var(--brand-primary)]/50 focus:ring-[var(--brand-primary)]/50',
              isAr && 'text-right'
            )}
          />
          {errors.email?.message && (
            <p className="text-[var(--brand-danger)] text-xs mt-1.5 ml-1">
              {t(errors.email.message as Parameters<typeof t>[0])}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <PasswordInput
            register={register('password')}
            placeholder={t('password')}
            disabled={isLoading}
            show={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
            isAr={isAr}
            invalid={Boolean(errors.password)}
          />
          {errors.password?.message && (
            <p className="text-[var(--brand-danger)] text-xs mt-1.5 ml-1">
              {t(errors.password.message as Parameters<typeof t>[0])}
            </p>
          )}

          <div className={cn('flex mt-2 px-1', isAr ? 'justify-start' : 'justify-end')}>
            <button
              type="button"
              onClick={() => switchMode('request')}
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
          className="w-full relative flex justify-center items-center h-12 bg-[var(--brand-primary)] rounded-lg text-[var(--brand-primary-fg)] font-bold hover:brightness-110 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
          style={{ boxShadow: `0 0 20px ${withOpacity(derivePrimaryHex(), 0.3)}` }}
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <div className="flex items-center gap-2">
              <LogIn size={18} className={isAr ? 'rotate-180' : ''} />
              {t('signIn')}
            </div>
          )}
        </motion.button>

        {serverError && <ErrorBanner message={serverError} />}
      </form>
    );
  }

  if (mode === 'request') {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = requestForm;
    return (
      <form onSubmit={handleSubmit(onRequestSubmit)} className="space-y-5">
        <ForgotHeader title={t('forgot.title')} subtitle={t('forgot.subtitle')} />

        <div>
          <input
            type="email"
            {...register('email')}
            placeholder={t('forgot.email')}
            disabled={isSubmitting}
            autoFocus
            className={cn(
              'w-full bg-white/5 border rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-1 transition-colors disabled:opacity-50',
              errors.email
                ? 'border-[var(--brand-danger)]/50 focus:border-[var(--brand-danger)] focus:ring-[var(--brand-danger)]/50'
                : 'border-white/10 focus:border-[var(--brand-primary)]/50 focus:ring-[var(--brand-primary)]/50',
              isAr && 'text-right'
            )}
          />
          {errors.email?.message && (
            <p className="text-[var(--brand-danger)] text-xs mt-1.5 ml-1">
              {t(errors.email.message as Parameters<typeof t>[0])}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full relative flex justify-center items-center h-12 bg-[var(--brand-primary)] rounded-lg text-[var(--brand-primary-fg)] font-bold hover:brightness-110 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
          style={{ boxShadow: `0 0 20px ${withOpacity(derivePrimaryHex(), 0.3)}` }}
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : t('forgot.sendCode')}
        </button>

        <BackToLoginButton onClick={() => switchMode('login')} label={t('forgot.back')} isAr={isAr} />

        {serverError && <ErrorBanner message={serverError} />}
      </form>
    );
  }

  // mode === 'verify'
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = verifyForm;
  return (
    <form onSubmit={handleSubmit(onVerifySubmit)} className="space-y-4">
      <ForgotHeader
        title={t('forgot.verifyTitle')}
        subtitle={t('forgot.verifySubtitle', { email: resetEmail })}
      />

      <div>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          {...register('code')}
          placeholder={t('forgot.code')}
          disabled={isSubmitting}
          autoFocus
          className={cn(
            'w-full bg-white/5 border rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-1 transition-colors tracking-[0.4em] text-center font-mono disabled:opacity-50',
            errors.code
              ? 'border-[var(--brand-danger)]/50 focus:border-[var(--brand-danger)] focus:ring-[var(--brand-danger)]/50'
              : 'border-white/10 focus:border-[var(--brand-primary)]/50 focus:ring-[var(--brand-primary)]/50'
          )}
        />
        {errors.code?.message && (
          <p className="text-[var(--brand-danger)] text-xs mt-1.5 ml-1">
            {t(errors.code.message as Parameters<typeof t>[0])}
          </p>
        )}
      </div>

      <div>
        <PasswordInput
          register={register('password')}
          placeholder={t('forgot.newPassword')}
          disabled={isSubmitting}
          show={showNewPassword}
          onToggle={() => setShowNewPassword((v) => !v)}
          isAr={isAr}
          invalid={Boolean(errors.password)}
          autoComplete="new-password"
        />
        {errors.password?.message && (
          <p className="text-[var(--brand-danger)] text-xs mt-1.5 ml-1">
            {t(errors.password.message as Parameters<typeof t>[0])}
          </p>
        )}
      </div>

      <div>
        <PasswordInput
          register={register('confirmPassword')}
          placeholder={t('forgot.confirmPassword')}
          disabled={isSubmitting}
          show={showConfirmPassword}
          onToggle={() => setShowConfirmPassword((v) => !v)}
          isAr={isAr}
          invalid={Boolean(errors.confirmPassword)}
          autoComplete="new-password"
        />
        {errors.confirmPassword?.message && (
          <p className="text-[var(--brand-danger)] text-xs mt-1.5 ml-1">
            {t(errors.confirmPassword.message as Parameters<typeof t>[0])}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full relative flex justify-center items-center h-12 bg-[var(--brand-primary)] rounded-lg text-[var(--brand-primary-fg)] font-bold hover:brightness-110 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
        style={{ boxShadow: `0 0 20px ${withOpacity(derivePrimaryHex(), 0.3)}` }}
      >
        {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : t('forgot.submit')}
      </button>

      <div className="flex items-center justify-between text-xs">
        <BackToLoginButton onClick={() => switchMode('login')} label={t('forgot.back')} isAr={isAr} compact />
        <button
          type="button"
          onClick={onResendCode}
          disabled={isResending || isSubmitting}
          className="font-semibold text-[var(--brand-primary)] hover:underline disabled:opacity-50"
        >
          {isResending ? t('forgot.resending') : t('forgot.resend')}
        </button>
      </div>

      {infoMessage && (
        <div className="text-[var(--brand-primary)] text-sm bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/20 py-2 px-3 rounded-lg flex items-start gap-2">
          <CheckCircle2 className="shrink-0 mt-0.5" size={16} />
          <span>{infoMessage}</span>
        </div>
      )}
      {serverError && <ErrorBanner message={serverError} />}
    </form>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function PasswordInput({
  register,
  placeholder,
  disabled,
  show,
  onToggle,
  isAr,
  invalid,
  autoComplete = 'current-password',
}: {
  register: UseFormRegisterReturn;
  placeholder: string;
  disabled: boolean;
  show: boolean;
  onToggle: () => void;
  isAr: boolean;
  invalid: boolean;
  autoComplete?: 'current-password' | 'new-password';
}) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        {...register}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        className={cn(
          'w-full bg-white/5 border rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-1 transition-colors disabled:opacity-50',
          invalid
            ? 'border-[var(--brand-danger)]/50 focus:border-[var(--brand-danger)] focus:ring-[var(--brand-danger)]/50'
            : 'border-white/10 focus:border-[var(--brand-primary)]/50 focus:ring-[var(--brand-primary)]/50',
          isAr ? 'pr-4 pl-12 text-right' : 'pl-4 pr-12'
        )}
      />
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors disabled:opacity-50',
          isAr ? 'left-4' : 'right-4'
        )}
      >
        {show ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
      </button>
    </div>
  );
}

function ForgotHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center">
      <h3 className="text-white font-semibold text-base">{title}</h3>
      <p className="text-white/50 text-xs mt-1">{subtitle}</p>
    </div>
  );
}

function BackToLoginButton({
  onClick,
  label,
  isAr,
  compact = false,
}: {
  onClick: () => void;
  label: string;
  isAr: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 font-semibold text-white/60 hover:text-white transition-colors',
        compact ? 'text-xs' : 'text-sm w-full justify-center'
      )}
    >
      <ArrowLeft size={14} className={isAr ? 'rotate-180' : ''} />
      {label}
    </button>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-[var(--brand-danger)] text-sm text-center mt-4 bg-[var(--brand-danger)]/10 py-2 px-3 rounded-lg border border-[var(--brand-danger)]/20 flex items-start gap-2"
    >
      <AlertCircle className="shrink-0 mt-0.5" size={16} />
      <span className="text-left">{message}</span>
    </motion.div>
  );
}

// Helper to read the brand primary color for the glow effect.
function derivePrimaryHex() {
  if (typeof window === 'undefined') return '#4fc5df';
  return (
    getComputedStyle(document.documentElement)
      .getPropertyValue('--brand-primary')
      .trim() || '#4fc5df'
  );
}

function withOpacity(hex: string, opacity: number): string {
  if (!hex.startsWith('#')) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
