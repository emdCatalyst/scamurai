'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations, useFormatter, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { 
  X, 
  Mail, 
  Calendar, 
  ShieldAlert,
  Loader2,
  Building2,
  Users,
  Palette,
  Copy,
  ExternalLink,
  ShieldOff,
  ShieldCheck
} from 'lucide-react';
import { BrandRow } from '@/lib/queries/brands';
import { BrandStatusBadge } from './BrandStatusBadge';
import { BrandColorSwatches } from './BrandColorSwatches';
import { setBrandStatus } from '@/actions/setBrandStatus';
import { useToast } from '@/components/ui/Toast';
import Dialog from '@/components/ui/Dialog';
import { Link } from '@/i18n/navigation';

interface BrandDetailDrawerProps {
  brand: BrandRow;
  onClose: () => void;
}

export function BrandDetailDrawer({
  brand,
  onClose,
}: BrandDetailDrawerProps) {
  const t = useTranslations('admin.brands');
  const format = useFormatter();
  const locale = useLocale();
  const { adminSlug } = useParams();
  const isAr = locale === 'ar';
  const router = useRouter();
  const { toast } = useToast();

  const [isUpdating, setIsUpdating] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);

  const now = useMemo(() => new Date(), []);

  // Close on ESC and manage body overflow
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.body.style.overflow = 'hidden';
    
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const handleToggleStatus = async () => {
    setShowStatusConfirm(false);
    setIsUpdating(true);
    try {
      const result = await setBrandStatus({
        brandId: brand.id,
        isActive: !brand.isActive,
      });
      if (result.success) {
        toast(
          brand.isActive ? t('actions.successSuspended') : t('actions.successActivated'),
          'success'
        );
        router.refresh();
        onClose();
      } else {
        toast(result.error || t('actions.error'), 'error');
      }
    } catch {
      toast(t('actions.error'), 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const copySlug = () => {
    navigator.clipboard.writeText(brand.slug);
    toast(t("detail.copySlug"), "success");
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: isAr ? '-100%' : '100%' }}
        animate={{ x: 0 }}
        exit={{ x: isAr ? '-100%' : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`fixed inset-y-0 ${isAr ? 'left-0' : 'right-0'} w-full max-w-lg bg-white shadow-2xl z-[70] flex flex-col overflow-hidden`}
      >
        {/* Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3">
              {brand.logoUrl ? (
                <img
                  src={brand.logoUrl}
                  alt={brand.name}
                  className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 object-contain"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-navy text-white flex items-center justify-center font-bold text-sm">
                  {brand.name.charAt(0)}
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-none">{brand.name}</h2>
                <BrandStatusBadge isActive={brand.isActive} className="mt-1" />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="space-y-10">
            {/* Slug copied pattern */}
            <div className="group relative">
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5">{t('detail.slug')}</p>
              <div 
                onClick={copySlug}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-sky/30 cursor-pointer transition-all"
              >
                <code className="text-sm font-mono text-slate-600">/brands/{brand.slug}</code>
                <Copy size={14} className="text-slate-400 group-hover:text-sky transition-colors" />
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-8">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <ExternalLink size={16} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">{t('table.plan')}</p>
                  <p className="text-sm font-bold text-navy capitalize">{brand.plan}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <Calendar size={16} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">{t('detail.created')}</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {format.dateTime(new Date(brand.createdAt), { dateStyle: 'medium' })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <Building2 size={16} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">{t('detail.branches')}</p>
                  <p className="text-sm font-bold text-slate-900">{brand.branchCount}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <Users size={16} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">{t('detail.onboarding')}</p>
                  <p className={`text-sm font-bold ${brand.onboardingComplete ? 'text-mint' : 'text-amber-500'}`}>
                    {brand.onboardingComplete ? t('table.onboardingComplete') : t('table.onboardingPending')}
                  </p>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Admin Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <Users size={16} className="text-sky" />
                {t('detail.admin')}
              </div>
              <div className="bg-slate-50 rounded-2xl p-5 space-y-4 border border-slate-100">
                {brand.brandAdminEmail ? (
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-navy text-white flex items-center justify-center font-bold">
                      {brand.brandAdminEmail.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <Link 
                        href={`/${adminSlug}/users?brand=${brand.id}`}
                        className="text-sm font-bold text-slate-900 hover:text-sky transition-colors flex items-center gap-1.5"
                      >
                        {brand.brandAdminEmail}
                        <ExternalLink size={14} />
                      </Link>
                      <p className="text-xs text-slate-500">
                        {brand.brandAdminJoinedAt 
                          ? t('detail.joined') + ": " + format.dateTime(new Date(brand.brandAdminJoinedAt), { dateStyle: 'medium' })
                          : t('detail.invitePending')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic py-2">
                    {t('detail.invitePending')}
                  </p>
                )}
              </div>
            </div>

            {/* Brand Colors */}
            {brand.brandColors && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <Palette size={16} className="text-sky" />
                  {t('detail.colors')}
                </div>
                <BrandColorSwatches colors={brand.brandColors} />
              </div>
            )}

            {/* Danger Zone */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2 text-red-500 font-bold text-sm">
                <ShieldAlert size={16} />
                {t('detail.dangerZone')}
              </div>
              <button
                onClick={() => setShowStatusConfirm(true)}
                disabled={isUpdating}
                className={`w-full py-4 rounded-2xl text-sm font-bold transition-all border flex items-center justify-center gap-2 ${
                  brand.isActive
                    ? "border-red-200 text-red-500 hover:bg-red-50"
                    : "border-mint/20 text-mint hover:bg-mint/5"
                } disabled:opacity-50`}
              >
                {isUpdating ? <Loader2 size={18} className="animate-spin" /> : (brand.isActive ? <ShieldOff size={18} /> : <ShieldCheck size={18} />)}
                {brand.isActive ? t("actions.suspend") : t("actions.activate")}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Confirmation Dialogs */}
      <Dialog
        isOpen={showStatusConfirm}
        onClose={() => setShowStatusConfirm(false)}
        onConfirm={handleToggleStatus}
        title={brand.isActive ? t("actions.suspend") : t("actions.activate")}
        description={brand.isActive ? t("actions.confirmSuspend") : t("actions.confirmActivate")}
        type={brand.isActive ? "danger" : "info"}
        isLoading={isUpdating}
      />
    </>
  );
}
