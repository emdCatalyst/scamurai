import { ArrowRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ServiceDefinition } from '@/config/services';
import { isLiveService } from '@/lib/services/catalog';
import { ButtonLink } from '../primitives';
import { getApplyHref } from './links';

/**
 * Main call to action for a service: "Get started" when it is live,
 * "Register interest" while it is coming soon. Both open the application
 * form with the service preselected.
 */
export default async function ApplyButton({
  service,
  className,
}: {
  service: ServiceDefinition;
  className?: string;
}) {
  const t = await getTranslations('marketing');

  return (
    <ButtonLink href={getApplyHref(service.key)} size="lg" className={className}>
      {t(isLiveService(service) ? 'getStarted' : 'registerInterest')}
      <ArrowRight aria-hidden="true" focusable="false" size={18} className="rtl:rotate-180" />
    </ButtonLink>
  );
}
