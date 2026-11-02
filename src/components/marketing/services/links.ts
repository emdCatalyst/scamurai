import type { ComponentProps } from 'react';
import type { PlanTier, ServiceDefinition, ServiceKey } from '@/config/services';
import type { Link } from '@/i18n/navigation';

type Href = ComponentProps<typeof Link>['href'];

/** Application form with the service (and optionally the plan) preselected. */
export function getApplyHref(service: ServiceKey, plan?: PlanTier): Href {
  return { pathname: '/apply', query: plan ? { service, plan } : { service } };
}

/** Locale-less path of a service page, e.g. `/services/order-protection`. */
export function getServicePath(service: Pick<ServiceDefinition, 'slug'>): string {
  return `/services/${service.slug}`;
}
