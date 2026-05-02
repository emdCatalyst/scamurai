'use client';

import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Shield, LayoutGrid, Users, ArrowUpRight } from 'lucide-react';
import GradientBadge from '@/components/ui/GradientBadge';

interface PlanLimitsPanelProps {
  plan: string;
  branchCount: number;
  branchLimit: number;
  userCount: number;
  userLimit: number;
}

export default function PlanLimitsPanel({
  plan,
  branchCount,
  branchLimit,
  userCount,
  userLimit,
}: PlanLimitsPanelProps) {
  const t = useTranslations('brand.settings.plan');
  const locale = useLocale();
  const isAr = locale === 'ar';

  const branchPercentage = Math.min((branchCount / branchLimit) * 100, 100);
  const userPercentage = Math.min((userCount / userLimit) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6 backdrop-blur-md"
    >
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[var(--brand-primary)]/10 p-2 text-[var(--brand-primary)]">
            <Shield size={20} strokeWidth={1.5} />
          </div>
          <h2 className={`text-xl font-bold text-[var(--brand-surface-fg)] ${isAr ? 'font-arabic' : ''}`}>
            {t('title')}
          </h2>
        </div>
        <GradientBadge className="capitalize">
          {plan}
        </GradientBadge>
      </div>

      <div className="space-y-8">
        {/* Branch Limits */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-[var(--brand-surface-fg-muted)]">
              <LayoutGrid size={16} strokeWidth={1.5} className="text-[var(--brand-primary)]" />
              <span className={isAr ? 'font-arabic' : ''}>{useTranslations('brand.shell')('branches')}</span>
            </div>
            <span className={`font-medium text-[var(--brand-surface-fg)] ${isAr ? 'font-arabic' : ''}`}>
              {t('branchesUsed', { used: branchCount, limit: branchLimit })}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--brand-background)]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${branchPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full ${branchPercentage >= 90 ? 'bg-[var(--brand-danger)]' : 'bg-[var(--brand-primary)]'}`}
            />
          </div>
        </div>

        {/* User Limits */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-[var(--brand-surface-fg-muted)]">
              <Users size={16} strokeWidth={1.5} className="text-[var(--brand-primary)]" />
              <span className={isAr ? 'font-arabic' : ''}>{useTranslations('brand.shell')('team')}</span>
            </div>
            <span className={`font-medium text-[var(--brand-surface-fg)] ${isAr ? 'font-arabic' : ''}`}>
              {t('usersUsed', { used: userCount, limit: userLimit })}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--brand-background)]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${userPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              className={`h-full rounded-full ${userPercentage >= 90 ? 'bg-[var(--brand-danger)]' : 'bg-[var(--brand-primary)]'}`}
            />
          </div>
        </div>

        <div className="h-px bg-[var(--brand-border)]" />

        <div className="flex items-center justify-between rounded-xl bg-[var(--brand-background)]/50 p-4">
          <p className={`text-sm text-[var(--brand-surface-fg-muted)] ${isAr ? 'font-arabic' : ''}`}>
            {t('upgradeMessage')}
          </p>
          <a
            href="mailto:support@scamurai.com"
            className="flex items-center gap-1 text-sm font-bold text-[var(--brand-primary)] hover:underline"
          >
            <span className={isAr ? 'font-arabic' : ''}>{useTranslations('plans')('contactUs')}</span>
            <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
    </motion.div>
  );
}
