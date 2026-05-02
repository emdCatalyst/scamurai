'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { BrandSwitch } from '@/components/ui/BrandSwitch';
import { setDeliveryAppStatus } from '@/actions/brand/setDeliveryAppStatus';
import { useToast } from '@/components/ui/Toast';
import { useTranslations } from 'next-intl';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeliveryAppCardProps {
  app: {
    id: string;
    name: string;
    logoUrl: string | null;
  };
  initiallyEnabled: boolean;
}

export function DeliveryAppCard({ app, initiallyEnabled }: DeliveryAppCardProps) {
  const [isEnabled, setIsEnabled] = useState(initiallyEnabled);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const t = useTranslations('brand.deliveryApps');

  const handleToggle = async (checked: boolean) => {
    // Optimistic UI
    const previousState = isEnabled;
    setIsEnabled(checked);

    startTransition(async () => {
      const result = await setDeliveryAppStatus(app.id, checked);
      
      if (!result.success) {
        setIsEnabled(previousState);
        toast(t('errors.toggleFailed'), 'error');
      }
    });
  };

  return (
    <div className="bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-2xl p-6 transition-all hover:shadow-lg hover:shadow-[var(--brand-primary)]/5 group">
      <div className="flex items-center justify-between mb-6">
        <div className="w-12 h-12 rounded-xl bg-[var(--brand-surface-fg)]/5 flex items-center justify-center overflow-hidden border border-[var(--brand-border)]">
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
        <BrandSwitch 
          checked={isEnabled} 
          onChange={handleToggle}
          disabled={isPending}
        />
      </div>
      
      <div>
        <h3 className="text-[var(--brand-text-accent)] font-bold text-lg mb-1">
          {app.name}
        </h3>
        <p className="text-[var(--brand-surface-fg-muted)] text-xs font-medium uppercase tracking-wider">
          {isEnabled ? t('status.enabled') : t('status.disabled')}
        </p>
      </div>
    </div>
  );
}
