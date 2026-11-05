import { ChefHat, Coffee, Pill, ShoppingBag, ShoppingCart, Store, type LucideIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Container } from '@/components/marketing/primitives';

/** Sectors the platform is built for. Labels live in `socialProof.sectors`. */
const SECTORS: readonly { key: string; icon: LucideIcon }[] = [
  { key: 'restaurants', icon: ChefHat },
  { key: 'cafes', icon: Coffee },
  { key: 'cloudKitchens', icon: Store },
  { key: 'retail', icon: ShoppingBag },
  { key: 'supermarkets', icon: ShoppingCart },
  { key: 'pharmacies', icon: Pill },
];

export default async function SocialProofBar() {
  const t = await getTranslations('socialProof');

  return (
    <section
      aria-labelledby="sectors-title"
      className="relative border-y border-white/10 bg-charcoal py-6"
    >
      <Container className="flex flex-col items-center gap-5 lg:flex-row lg:justify-between">
        <h2 id="sectors-title" className="text-center text-xs font-semibold uppercase tracking-widest text-white/70 lg:text-start">
          {t('label')}
        </h2>

        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {SECTORS.map(({ key, icon: Icon }) => (
            <li key={key} className="flex items-center gap-2 text-sm font-medium text-white/70">
              <Icon aria-hidden="true" size={16} strokeWidth={1.75} className="text-white/70" />
              {t(`sectors.${key}`)}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
