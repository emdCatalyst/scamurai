'use client';

import { useTranslations } from 'next-intl';

export type ApplicationStatus = 'pending' | 'quoted' | 'approved' | 'rejected';

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
  className?: string;
}

export default function ApplicationStatusBadge({ status, className = '' }: ApplicationStatusBadgeProps) {
  const t = useTranslations('admin.applications.status');

  const styles = {
    pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    quoted: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
    approved: 'bg-mint-500/10 text-mint-500 border-mint-500/20',
    rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  // Fallback to mint if success color from DESIGN_SYSTEM is #5cbf8f
  // Our mint is defined as #5cbf8f. Let's use custom tailwind colors if available, 
  // or stick to the palette semanticly.
  
  const semanticStyles = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    quoted: 'bg-sky-100 text-sky-700 border-sky-200',
    approved: 'bg-[#5cbf8f]/10 text-[#5cbf8f] border-[#5cbf8f]/20',
    rejected: 'bg-red-100 text-red-700 border-red-200',
  };

  // Re-applying based on DESIGN_SYSTEM.md:
  // mint: #5cbf8f
  // sky: #4fc5df
  // navy: #172b49
  
  const finalStyles = {
    pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    quoted: 'bg-[#4fc5df]/10 text-[#4fc5df] border-[#4fc5df]/20',
    approved: 'bg-[#5cbf8f]/10 text-[#5cbf8f] border-[#5cbf8f]/20',
    rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${finalStyles[status]} ${className}`}>
      {t(status)}
    </span>
  );
}
