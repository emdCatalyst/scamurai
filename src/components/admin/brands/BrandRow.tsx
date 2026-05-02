'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { BrandRow as BrandRowType } from '@/lib/queries/brands';
import { BrandStatusBadge } from './BrandStatusBadge';
import { cn } from '@/lib/utils';
import { ShieldOff, ShieldCheck, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { setBrandStatus } from '@/actions/setBrandStatus';
import { useToast } from '@/components/ui/Toast';
import Dialog from '@/components/ui/Dialog';
import { Link } from '@/i18n/navigation';

interface BrandRowProps {
  brand: BrandRowType;
  onViewDetails: (brand: BrandRowType) => void;
}

export function BrandRow({ brand, onViewDetails }: BrandRowProps) {
  const t = useTranslations('admin.brands');
  const { toast } = useToast();
  const { adminSlug } = useParams();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsConfirmOpen(true);
  };

  const onConfirmToggle = async () => {
    setIsLoading(true);
    const result = await setBrandStatus({
      brandId: brand.id,
      isActive: !brand.isActive,
    });
    setIsLoading(false);
    setIsConfirmOpen(false);

    if (result.success) {
      toast(
        brand.isActive ? t('actions.successSuspended') : t('actions.successActivated'),
        'success'
      );
    } else {
      toast(result.error || t('actions.error'), 'error');
    }
  };

  return (
    <>
      <tr
        onClick={() => onViewDetails(brand)}
        className="group hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors cursor-pointer"
      >
        <td className="py-4 px-4 ps-6">
          <div className="flex items-center gap-3">
            {brand.logoUrl ? (
              <img
                src={brand.logoUrl}
                alt={brand.name}
                className="w-10 h-10 rounded-lg bg-white border border-slate-200 object-contain shadow-sm"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-navy text-white flex items-center justify-center font-bold text-sm shadow-sm">
                {brand.name.charAt(0)}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-slate-800 truncate group-hover:text-sky transition-colors">
                {brand.name}
              </span>
              <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                {brand.slug}
              </span>
            </div>
          </div>
        </td>
        
        <td className="py-4 px-4">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-navy text-white">
            {brand.plan}
          </span>
        </td>

        <td className="py-4 px-4">
          {brand.brandAdminEmail ? (
            <Link
              href={`/${adminSlug}/users?brand=${brand.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-medium text-slate-600 hover:text-sky transition-colors underline decoration-slate-200 underline-offset-4"
            >
              {brand.brandAdminEmail}
            </Link>
          ) : (
            <span className="text-sm text-slate-400">—</span>
          )}
        </td>

        <td className="py-4 px-4 text-center">
          <span className="text-sm font-bold text-slate-800">{brand.branchCount}</span>
        </td>

        <td className="py-4 px-4 text-center">
          <div className="flex justify-center">
            {brand.onboardingComplete ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-mint/10 border border-mint/20 text-mint text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-mint" />
                {t('table.onboardingComplete')}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {t('table.onboardingPending')}
              </div>
            )}
          </div>
        </td>

        <td className="py-4 px-4 text-center">
          <BrandStatusBadge isActive={brand.isActive} />
        </td>

        <td className="py-4 px-4 pe-6 text-right">
          <div className="flex justify-end items-center gap-2">
            <button
              onClick={handleToggleStatus}
              className={cn(
                "p-2 rounded-lg transition-all",
                brand.isActive 
                  ? "text-slate-400 hover:text-red-500 hover:bg-red-50" 
                  : "text-slate-400 hover:text-mint hover:bg-mint/5"
              )}
              title={brand.isActive ? t('actions.suspend') : t('actions.activate')}
            >
              {brand.isActive ? <ShieldOff size={18} /> : <ShieldCheck size={18} />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(brand);
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
        type={brand.isActive ? "danger" : "info"}
        title={brand.isActive ? t("actions.suspend") : t("actions.activate")}
        description={brand.isActive ? t("actions.confirmSuspend") : t("actions.confirmActivate")}
      />
    </>
  );
}
