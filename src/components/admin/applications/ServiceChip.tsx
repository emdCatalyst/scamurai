import { useTranslations } from 'next-intl';
import type { ServiceAccent, ServiceKey } from '@/config/services';
import { getService } from '@/lib/services/catalog';
import ServiceIcon from '@/components/marketing/ServiceIcon';
import { cn } from '@/lib/cn';

/**
 * Light-theme chips: black text on white, with the product colour carried by
 * the icon only (the guide keeps text black or white).
 */
const CHIP_STYLES: Record<ServiceAccent, { chip: string; icon: string }> = {
  orange: { chip: 'bg-white text-navy border-line', icon: 'text-sky-600' },
  cobalt: { chip: 'bg-white text-navy border-line', icon: 'text-cobalt' },
  yellow: { chip: 'bg-white text-navy border-line', icon: 'text-amber-600' },
};

export default function ServiceChip({ service, className }: { service: ServiceKey; className?: string }) {
  const t = useTranslations('services');
  const { accent, icon } = getService(service);
  const styles = CHIP_STYLES[accent];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold whitespace-nowrap',
        styles.chip,
        className
      )}
    >
      <ServiceIcon name={icon} size={14} className={cn('shrink-0', styles.icon)} />
      {t(`${service}.name`)}
    </span>
  );
}
