'use client';

import { useTranslations, useLocale } from 'next-intl';
import { AlertTriangle } from 'lucide-react';

export interface ColorSlot {
  key: 'primary' | 'background' | 'surface' | 'textAccent';
  label: string;
  value: string;
}

interface ColorSlotPickerProps {
  slots: ColorSlot[];
  onChange: (key: ColorSlot['key'], value: string) => void;
  warnings: Record<string, string>;
}

export default function ColorSlotPicker({ slots, onChange, warnings }: ColorSlotPickerProps) {
  const t = useTranslations('onboarding');
  const locale = useLocale();
  const isAr = locale === 'ar';

  return (
    <div className="grid grid-cols-2 gap-4">
      {slots.map((slot) => (
        <div key={slot.key} className="flex flex-col gap-2">
          <label
            htmlFor={`color-${slot.key}`}
            className={`text-xs font-medium text-white/60 ${isAr ? 'font-arabic' : ''}`}
          >
            {slot.label}
          </label>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                id={`color-${slot.key}`}
                type="color"
                value={slot.value}
                onChange={(e) => onChange(slot.key, e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-lg border-2 border-white/10 bg-transparent p-0 transition-all hover:border-white/20 focus:border-sky/50 focus:outline-none"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <span className="font-mono text-xs text-white/40 uppercase">
              {slot.value}
            </span>
          </div>
          {warnings[slot.key] && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-400/80">
              <AlertTriangle size={11} strokeWidth={1.5} />
              <span className={isAr ? 'font-arabic' : ''}>
                {warnings[slot.key]}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
