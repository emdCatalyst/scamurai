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
  Palette,
  Copy,
  ExternalLink,
  ShieldOff,
  ShieldCheck,
  UserX,
  UserCheck
} from 'lucide-react';
import { UserRow } from '@/lib/queries/users';
import { UserRoleBadge } from './UserRoleBadge';
import { UserAvatar } from './UserAvatar';
import { setUserStatus } from '@/actions/setUserStatus';
import { useToast } from '@/components/ui/Toast';
import Dialog from '@/components/ui/Dialog';
import { Link } from '@/i18n/navigation';

interface UserDetailDrawerProps {
  user: UserRow;
  onClose: () => void;
}

export function UserDetailDrawer({
  user,
  onClose,
}: UserDetailDrawerProps) {
  const t = useTranslations('admin.users');
  const tBrands = useTranslations('admin.brands');
  const format = useFormatter();
  const locale = useLocale();
  const { adminSlug } = useParams();
  const isAr = locale === 'ar';
  const router = useRouter();
  const { toast } = useToast();

  const [isUpdating, setIsUpdating] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);

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
      const result = await setUserStatus({
        userId: user.id,
        isActive: !user.isActive,
      });
      if (result.success) {
        toast(
          user.isActive ? t('actions.successDeactivated') : t('actions.successActivated'),
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

  const copyEmail = () => {
    navigator.clipboard.writeText(user.email);
    toast(t("detail.copyEmail"), "success");
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
          <div className="flex items-center gap-4 min-w-0">
            <button 
              onClick={onClose}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 min-w-0">
              <UserAvatar name={user.fullName} className="w-10 h-10" />
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900 leading-none truncate">{user.fullName}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <UserRoleBadge role={user.role} />
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${user.isActive ? "bg-[#5cbf8f]/10 text-[#5cbf8f] border-[#5cbf8f]/20" : "bg-red-500/10 text-red-500 border-red-500/20"}`}>
                    {user.isActive ? t('table.statusActive') : t('table.statusInactive')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="space-y-10">
            {/* Account Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('detail.info')}</h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="group">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5">{t('detail.email')}</p>
                  <div 
                    onClick={copyEmail}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-sky/30 cursor-pointer transition-all"
                  >
                    <span className="text-sm font-medium text-slate-600 truncate mr-2">{user.email}</span>
                    <Copy size={14} className="text-slate-400 group-hover:text-sky transition-colors shrink-0" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">{t('detail.joined')}</p>
                    <p className="text-sm font-semibold text-slate-700">
                      {user.joinedAt ? format.dateTime(new Date(user.joinedAt), { dateStyle: 'medium' }) : t('table.invitePending')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">{t('detail.created')}</p>
                    <p className="text-sm font-semibold text-slate-700">
                      {format.dateTime(new Date(user.createdAt), { dateStyle: 'medium' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Brand & Access */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('detail.access')}</h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">{t('detail.brand')}</p>
                    {user.brandName ? (
                      <Link 
                        href={`/${adminSlug}/brands?q=${user.brandSlug}`}
                        className="text-sm font-bold text-navy hover:text-sky transition-colors flex items-center gap-1.5"
                      >
                        {user.brandName}
                        <ExternalLink size={14} />
                      </Link>
                    ) : (
                      <p className="text-sm font-bold text-slate-400">—</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">{t('detail.branch')}</p>
                    <p className="text-sm font-bold text-slate-900">{user.branchName || t('table.allBranches')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                    <Palette size={16} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-0.5">{t('detail.onboarding')}</p>
                    <p className={`text-sm font-bold ${user.onboardingComplete ? 'text-mint' : 'text-amber-500'}`}>
                      {user.onboardingComplete ? tBrands('table.onboardingComplete') : tBrands('table.onboardingPending')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

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
                  user.isActive
                    ? "border-red-200 text-red-500 hover:bg-red-50"
                    : "border-[#5cbf8f]/20 text-[#5cbf8f] hover:bg-[#5cbf8f]/5"
                } disabled:opacity-50`}
              >
                {isUpdating ? <Loader2 size={18} className="animate-spin" /> : (user.isActive ? <UserX size={18} /> : <UserCheck size={18} />)}
                {user.isActive ? t("actions.deactivate") : t("actions.activate")}
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
        title={user.isActive ? t("actions.deactivate") : t("actions.activate")}
        description={user.isActive ? t("actions.confirmDeactivate") : t("actions.confirmActivate")}
        type={user.isActive ? "danger" : "info"}
        isLoading={isUpdating}
      />
    </>
  );
}
