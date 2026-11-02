import { getTranslations } from 'next-intl/server';
import type { ServiceDefinition } from '@/config/services';
import { FAQ_IDS, serviceNamespace } from './content';

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * A service's FAQ in the request locale. Both the visible <ServiceFaq> and the
 * page's FAQPage JSON-LD read it from here, so the two can never drift apart.
 */
export async function getServiceFaq(service: Pick<ServiceDefinition, 'key'>): Promise<FaqItem[]> {
  const t = await getTranslations(`${serviceNamespace(service.key)}.faq.items`);
  return FAQ_IDS.map((id) => ({ question: t(`${id}.question`), answer: t(`${id}.answer`) }));
}
