import { ClipboardCheck, PackageCheck, ShieldCheck, type LucideProps } from 'lucide-react';
import type { ServiceIconName } from '@/config/services';

const ICONS: Record<ServiceIconName, React.ComponentType<LucideProps>> = {
  'shield-check': ShieldCheck,
  'clipboard-check': ClipboardCheck,
  'package-check': PackageCheck,
};

/** Decorative service glyph; the service name always sits next to it. */
export default function ServiceIcon({ name, ...props }: { name: ServiceIconName } & LucideProps) {
  const Icon = ICONS[name];
  return <Icon aria-hidden="true" focusable="false" strokeWidth={1.75} {...props} />;
}
