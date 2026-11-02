import { useTranslations } from 'next-intl';
import type { ApplicationStatus } from '@/lib/applications/status';
import { cn } from '@/lib/cn';

/** Tinted pills with AA-contrast text on the light admin background. */
const STATUS_STYLES: Record<ApplicationStatus, string> = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  quoted: 'bg-sky-50 text-sky-800 border-sky-200',
  paid: 'bg-violet-50 text-violet-800 border-violet-200',
  approved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
  className?: string;
}

export default function ApplicationStatusBadge({ status, className }: ApplicationStatusBadgeProps) {
  const t = useTranslations('admin.applications.status');

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap',
        STATUS_STYLES[status],
        className
      )}
    >
      {t(status)}
    </span>
  );
}
