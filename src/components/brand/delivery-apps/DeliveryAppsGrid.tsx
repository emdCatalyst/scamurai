import { DeliveryAppCard } from './DeliveryAppCard';
import { UnavailableAppCard } from './UnavailableAppCard';
import { getTranslations } from 'next-intl/server';

interface DeliveryAppsGridProps {
  catalogApps: {
    id: string;
    name: string;
    logoUrl: string | null;
    isActive: boolean;
  }[];
  enabledAppIds: string[];
}

export async function DeliveryAppsGrid({ catalogApps, enabledAppIds }: DeliveryAppsGridProps) {
  const t = await getTranslations('brand.deliveryApps');

  if (catalogApps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center border-2 border-dashed border-[var(--brand-border)] rounded-3xl">
        <p className="text-[var(--brand-surface-fg)] font-bold text-xl mb-2">
          {t('empty.title')}
        </p>
        <p className="text-[var(--brand-surface-fg-muted)] text-sm max-w-sm">
          {t('empty.subtitle')}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {catalogApps.map((app) => (
        app.isActive ? (
          <DeliveryAppCard 
            key={app.id} 
            app={app} 
            initiallyEnabled={enabledAppIds.includes(app.id)} 
          />
        ) : (
          <UnavailableAppCard key={app.id} app={app} />
        )
      ))}
    </div>
  );
}
