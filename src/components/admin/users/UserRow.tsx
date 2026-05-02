'use client';

import { useTranslations } from 'next-intl';
import { UserRow as UserRowType } from '@/lib/queries/users';
import { UserRoleBadge } from './UserRoleBadge';
import { UserAvatar } from './UserAvatar';
import { cn } from '@/lib/utils';
import { UserX, UserCheck, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { setUserStatus } from '@/actions/setUserStatus';
import { useToast } from '@/components/ui/Toast';
import Dialog from '@/components/ui/Dialog';
import { Link } from '@/i18n/navigation';

interface UserRowProps {
  user: UserRowType;
  onViewDetails: (user: UserRowType) => void;
}

export function UserRow({ user, onViewDetails }: UserRowProps) {
  const t = useTranslations('admin.users');
  const { toast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirmOpen(true);
  };

  const onConfirmToggle = async () => {
    setIsLoading(true);
    const result = await setUserStatus({
      userId: user.id,
      isActive: !user.isActive,
    });
    setIsLoading(false);
    setIsConfirmOpen(false);

    if (result.success) {
      toast(
        user.isActive ? t('actions.successDeactivated') : t('actions.successActivated'),
        'success'
      );
    } else {
      toast(result.error || t('actions.error'), 'error');
    }
  };

  return (
    <>
      <tr
        onClick={() => onViewDetails(user)}
        className="group hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors cursor-pointer"
      >
        <td className="py-4 px-4 ps-6">
          <div className="flex items-center gap-3">
            <UserAvatar name={user.fullName} className="w-10 h-10" />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-800 truncate group-hover:text-sky transition-colors">
                {user.fullName}
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider">
                {user.email}
              </span>
            </div>
          </div>
        </td>
        
        <td className="py-4 px-4">
          <UserRoleBadge role={user.role} />
        </td>

        <td className="py-4 px-4">
          {user.brandName ? (
            <Link 
              href={`/brands?q=${user.brandSlug}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-medium text-slate-600 hover:text-sky transition-colors"
            >
              {user.brandName}
            </Link>
          ) : (
            <span className="text-sm text-slate-400">—</span>
          )}
        </td>

        <td className="py-4 px-4">
          <span className="text-sm text-slate-600">{user.branchName || t('table.allBranches')}</span>
        </td>

        <td className="py-4 px-4">
          {user.joinedAt ? (
            <span className="text-sm text-slate-500">
              {new Date(user.joinedAt).toLocaleDateString()}
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-wider">
              {t('table.invitePending')}
            </span>
          )}
        </td>

        <td className="py-4 px-4 text-center">
          <span className={cn(
            "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
            user.isActive 
              ? "bg-[#5cbf8f]/10 text-[#5cbf8f] border-[#5cbf8f]/20"
              : "bg-red-500/10 text-red-500 border-red-500/20"
          )}>
            {user.isActive ? t('table.statusActive') : t('table.statusInactive')}
          </span>
        </td>

        <td className="py-4 px-4 pe-6 text-right">
          <div className="flex justify-end items-center gap-2">
            <button
              onClick={handleToggleStatus}
              className={cn(
                "p-2 rounded-lg transition-all",
                user.isActive 
                  ? "text-slate-400 hover:text-red-500 hover:bg-red-50" 
                  : "text-slate-400 hover:text-[#5cbf8f] hover:bg-[#5cbf8f]/5"
              )}
              title={user.isActive ? t('actions.deactivate') : t('actions.activate')}
            >
              {user.isActive ? <UserX size={18} /> : <UserCheck size={18} />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(user);
              }}
              className="p-2 text-slate-400 hover:text-sky hover:bg-sky/5 rounded-lg transition-all"
            >
              <ExternalLink size={18} />
            </button>
          </div>
        </td>
      </tr>

      <Dialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={onConfirmToggle}
        isLoading={isLoading}
        type={user.isActive ? "danger" : "info"}
        title={user.isActive ? t("actions.deactivate") : t("actions.activate")}
        description={user.isActive ? t("actions.confirmDeactivate") : t("actions.confirmActivate")}
      />
    </>
  );
}
