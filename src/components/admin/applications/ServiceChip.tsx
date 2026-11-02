import { useTranslations } from 'next-intl';
import type { ServiceAccent, ServiceKey } from '@/config/services';
import { getService } from '@/lib/services/catalog';
import ServiceIcon from '@/components/marketing/ServiceIcon';
import { cn } from '@/lib/cn';

/**
 * Light-theme variants of the service accents. The marketing accents are tuned
 * for the dark site and are too pale for text on white, so the admin uses
 * darker shades of the same hues (WCAG AA contrast).
 */
const CHIP_STYLES: Record<ServiceAccent, { chip: string; icon: string }> = {
  sky: { chip: 'bg-sky-50 text-sky-800 border-sky-200', icon: 'text-sky-600' },
  mint: { chip: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: 'text-emerald-600' },
  amber: { chip: 'bg-amber-50 text-amber-800 border-amber-200', icon: 'text-amber-600' },
};

export default function ServiceChip({ service, className }: { service: ServiceKey; className?: string }) {
  const t = useTranslations('services');
  const { accent, icon } = getService(service);
  const styles = CHIP_STYLES[accent];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-semibold whitespace-nowrap',
        styles.chip,
        className
      )}
    >
      <ServiceIcon name={icon} size={14} className={cn('shrink-0', styles.icon)} />
      {t(`${service}.name`)}
    </span>
  );
}
