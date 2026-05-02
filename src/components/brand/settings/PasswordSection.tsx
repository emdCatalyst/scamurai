'use client';

import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Lock, Save } from 'lucide-react';

export default function PasswordSection() {
  const t = useTranslations('brand.settings.password');
  const locale = useLocale();
  const isAr = locale === 'ar';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6 opacity-60 backdrop-blur-md"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-[var(--brand-background)]/50 p-2 text-[var(--brand-surface-fg-muted)]">
          <Lock size={20} strokeWidth={1.5} />
        </div>
        <h2 className={`text-xl font-bold text-[var(--brand-surface-fg-muted)] ${isAr ? 'font-arabic' : ''}`}>
          {t('title')}
        </h2>
      </div>

      <div className="space-y-6">
        <p className={`text-sm text-[var(--brand-surface-fg-muted)] ${isAr ? 'font-arabic' : ''}`}>
          {t('message')}
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className={`text-sm font-semibold text-[var(--brand-surface-fg-muted)]/50 ${isAr ? 'font-arabic' : ''}`}>
              {t('newPassword')}
            </label>
            <input
              type="password"
              disabled
              placeholder="••••••••"
              className="w-full cursor-not-allowed rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)]/50 px-4 py-3 text-[var(--brand-background-fg-muted)]/50 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className={`text-sm font-semibold text-[var(--brand-surface-fg-muted)]/50 ${isAr ? 'font-arabic' : ''}`}>
              {t('confirmPassword')}
            </label>
            <input
              type="password"
              disabled
              placeholder="••••••••"
              className="w-full cursor-not-allowed rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)]/50 px-4 py-3 text-[var(--brand-background-fg-muted)]/50 outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            disabled
            className="flex items-center gap-2 rounded-xl bg-[var(--brand-background)]/50 ps-6 pe-6 py-3 font-semibold text-[var(--brand-background-fg-muted)]/50 cursor-not-allowed"
          >
            <Save size={18} />
            <span className={isAr ? 'font-arabic' : ''}>
              {t('save')}
            </span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
