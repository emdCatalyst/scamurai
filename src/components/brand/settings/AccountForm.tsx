'use client';

import { useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { User, Loader2, Save, Mail } from 'lucide-react';
import { updateBrandAdminAccount } from '@/actions/brand/updateBrandAdminAccount';
import { accountDetailsSchema } from '@/lib/validations/brandSettings';
import { useToast } from '@/components/ui/Toast';

interface AccountFormProps {
  initialData: {
    fullName: string;
    email: string;
  };
}

export default function AccountForm({ initialData }: AccountFormProps) {
  const t = useTranslations('brand.settings.account');
  const commonT = useTranslations('brand.settings');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { toast: showToast } = useToast();

  const [fullName, setFullName] = useState(initialData.fullName);
  const [email, setEmail] = useState(initialData.email);
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    const data = { fullName, email };
    const parsed = accountDetailsSchema.safeParse(data);
    
    if (!parsed.success) {
      const errs = parsed.error.flatten().fieldErrors;
      setFieldErrors(errs);
      showToast(commonT('error'), 'error');
      return;
    }

    startTransition(async () => {
      const result = await updateBrandAdminAccount(data);

      if (result.success) {
        showToast(commonT('success'), 'success');
      } else {
        showToast(result.error || commonT('error'), 'error');
      }
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6 backdrop-blur-md"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-[var(--brand-primary)]/10 p-2 text-[var(--brand-primary)]">
          <User size={20} strokeWidth={1.5} />
        </div>
        <h2 className={`text-xl font-bold text-[var(--brand-surface-fg)] ${isAr ? 'font-arabic' : ''}`}>
          {t('title')}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Full Name */}
          <div className="space-y-2">
            <label className={`text-sm font-semibold text-[var(--brand-surface-fg-muted)] ${isAr ? 'font-arabic' : ''}`}>
              {t('fullName')}
            </label>
            <div className="relative">
              <User className="absolute start-4 top-1/2 -translate-y-1/2 text-[var(--brand-background-fg-muted)]" size={18} />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`w-full rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] py-3 ps-11 pe-4 text-[var(--brand-background-fg)] focus:border-[var(--brand-primary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]/50 ${isAr ? 'font-arabic' : ''}`}
              />
            </div>
            {fieldErrors.fullName && (
              <p className="text-xs text-[var(--brand-danger)]">{fieldErrors.fullName[0]}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className={`text-sm font-semibold text-[var(--brand-surface-fg-muted)] ${isAr ? 'font-arabic' : ''}`}>
              {t('email')}
            </label>
            <div className="relative">
              <Mail className="absolute start-4 top-1/2 -translate-y-1/2 text-[var(--brand-background-fg-muted)]" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] py-3 ps-11 pe-4 text-[var(--brand-background-fg)] focus:border-[var(--brand-primary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]/50 ${isAr ? 'font-arabic' : ''}`}
              />
            </div>
            {fieldErrors.email && (
              <p className="text-xs text-[var(--brand-danger)]">{fieldErrors.email[0]}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] ps-6 pe-6 py-3 font-semibold text-[var(--brand-primary-fg)] transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            <span className={isAr ? 'font-arabic' : ''}>
              {isPending ? t('saving') : t('save')}
            </span>
          </button>
        </div>
      </form>
    </motion.div>
  );
}
