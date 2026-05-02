import Image from 'next/image';
import { Package, Lock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

interface UnavailableAppCardProps {
  app: {
    name: string;
    logoUrl: string | null;
  };
}

export async function UnavailableAppCard({ app }: UnavailableAppCardProps) {
  const t = await getTranslations('brand.deliveryApps');

  return (
    <div className="bg-[var(--brand-surface)]/50 border border-[var(--brand-border)] border-dashed rounded-2xl p-6 grayscale opacity-60 relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="w-12 h-12 rounded-xl bg-[var(--brand-surface-fg)]/10 flex items-center justify-center overflow-hidden">
          {app.logoUrl ? (
            <Image
              src={app.logoUrl}
              alt={app.name}
              width={32}
              height={32}
              className="object-contain"
            />
          ) : (
            <Package className="text-[var(--brand-surface-fg-muted)]" size={24} strokeWidth={1.5} />
          )}
        </div>
        <div className="bg-[var(--brand-surface-fg)]/10 p-1 rounded-lg">
          <Lock size={16} className="text-[var(--brand-surface-fg-muted)]" />
        </div>
      </div>
      
      <div>
        <h3 className="text-[var(--brand-surface-fg-muted)] font-bold text-lg mb-1">
          {app.name}
        </h3>
        <p className="text-[var(--brand-danger)] text-[10px] font-bold uppercase tracking-widest">
          {t('status.unavailable')}
        </p>
      </div>
    </div>
  );
}
