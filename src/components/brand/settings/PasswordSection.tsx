'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Lock, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useReverification } from '@clerk/nextjs';
import { isReverificationCancelledError } from '@clerk/nextjs/errors';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

type ClerkErrorShape = {
  errors?: Array<{ code?: string; longMessage?: string; message?: string }>;
};

// Inline schema — no `currentPassword`: Clerk's reverification modal collects
// it directly when the wrapped updatePassword call runs.
const settingsPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'errors.passwordMin')
      .max(128, 'errors.passwordMax'),
    confirmPassword: z.string().min(1, 'errors.confirmRequired'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'errors.mismatch',
  });

type SettingsPasswordFormValues = z.infer<typeof settingsPasswordSchema>;

export default function PasswordSection() {
  const t = useTranslations('brand.settings.password');
  const tErr = useTranslations('brand.changePassword.errors');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { user, isLoaded } = useUser();
  const { toast } = useToast();

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SettingsPasswordFormValues>({
    resolver: zodResolver(settingsPasswordSchema),
    mode: 'onChange',
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  // Clerk treats password changes as a high-assurance op — calling
  // updatePassword without currentPassword triggers Clerk's own
  // reverification modal, which collects the current password securely.
  // The hook retries the wrapped call after the modal succeeds.
  const updatePasswordReverified = useReverification(
    async (params: { newPassword: string; signOutOfOtherSessions: boolean }) => {
      if (!user) throw new Error('Not signed in');
      return user.updatePassword(params);
    }
  );

  const onSubmit = async (data: SettingsPasswordFormValues) => {
    setServerError('');
    if (!user) {
      setServerError(tErr('notAuthenticated'));
      return;
    }

    try {
      await updatePasswordReverified({
        newPassword: data.newPassword,
        signOutOfOtherSessions: true,
      });

      toast(t('successToast'), 'success');
      reset({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      if (isReverificationCancelledError(err)) {
        setServerError(tErr('reverificationCancelled'));
        return;
      }
      const clerkErr = err as ClerkErrorShape;
      const code = clerkErr.errors?.[0]?.code;
      const longMessage = clerkErr.errors?.[0]?.longMessage;

      switch (code) {
        case 'form_password_pwned':
          setServerError(tErr('pwned'));
          break;
        case 'form_password_validation_failed':
        case 'form_password_size_in_bytes_exceeded':
        case 'form_param_format_invalid':
          setServerError(tErr('validation'));
          break;
        default:
          setServerError(longMessage || tErr('generic'));
      }
    }
  };

  const fieldErrorKey = (key?: string) =>
    key ? (tErr(key as Parameters<typeof tErr>[0]) as string) : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6 backdrop-blur-md"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-[var(--brand-background)]/50 p-2 text-[var(--brand-primary)]">
          <Lock size={20} strokeWidth={1.5} />
        </div>
        <h2
          className={cn(
            'text-xl font-bold text-[var(--brand-surface-fg)]',
            isAr && 'font-arabic'
          )}
        >
          {t('title')}
        </h2>
      </div>

      <p
        className={cn(
          'mb-6 text-sm text-[var(--brand-surface-fg-muted)]',
          isAr && 'font-arabic'
        )}
      >
        {t('message')}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <PasswordField
            label={t('newPassword')}
            register={register('newPassword')}
            show={showNew}
            onToggle={() => setShowNew((v) => !v)}
            error={fieldErrorKey(errors.newPassword?.message)}
            isAr={isAr}
          />
          <PasswordField
            label={t('confirmPassword')}
            register={register('confirmPassword')}
            show={showConfirm}
            onToggle={() => setShowConfirm((v) => !v)}
            error={fieldErrorKey(errors.confirmPassword?.message)}
            isAr={isAr}
          />
        </div>

        {serverError && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {serverError}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !isLoaded}
            className={cn(
              'flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-6 py-3 font-semibold text-[var(--brand-primary-fg)] shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed',
              !isSubmitting && 'hover:opacity-90 active:scale-[0.98]'
            )}
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            <span className={isAr ? 'font-arabic' : ''}>
              {isSubmitting ? t('saving') : t('save')}
            </span>
          </button>
        </div>
      </form>
    </motion.div>
  );
}

interface PasswordFieldProps {
  label: string;
  register: ReturnType<
    ReturnType<typeof useForm<SettingsPasswordFormValues>>['register']
  >;
  show: boolean;
  onToggle: () => void;
  error?: string;
  isAr: boolean;
}

function PasswordField({
  label,
  register,
  show,
  onToggle,
  error,
  isAr,
}: PasswordFieldProps) {
  return (
    <div className="space-y-2">
      <label
        className={cn(
          'text-sm font-semibold text-[var(--brand-surface-fg-muted)]',
          isAr && 'font-arabic'
        )}
      >
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          {...register}
          placeholder="••••••••"
          className={cn(
            'w-full rounded-xl border bg-[var(--brand-background)]/30 px-4 py-3 text-[var(--brand-surface-fg)] outline-none transition-colors focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]',
            error ? 'border-red-500/50' : 'border-[var(--brand-border)]'
          )}
        />
        <button
          type="button"
          onClick={onToggle}
          tabIndex={-1}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 text-[var(--brand-surface-fg-muted)] hover:text-[var(--brand-surface-fg)]',
            isAr ? 'left-3' : 'right-3'
          )}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
