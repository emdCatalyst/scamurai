'use client';

import { useState, useMemo, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Loader2, Save, Image as ImageIcon, AlertCircle, RefreshCcw } from 'lucide-react';
import LogoUpload from '../../onboarding/LogoUpload';
import ColorSlotPicker, { type ColorSlot } from '../../onboarding/ColorSlotPicker';
import { updateBrandIdentity } from '@/actions/brand/updateBrandIdentity';
import { brandIdentitySchema } from '@/lib/validations/brandSettings';
import { useToast } from '@/components/ui/Toast';

interface BrandIdentityFormProps {
  brandId: string;
  initialData: {
    name: string;
    slug: string;
    logoUrl: string | null;
    brandColors: {
      primary: string;
      background: string;
      surface: string;
      textAccent: string;
    } | null;
  };
}

const DEFAULT_COLORS = {
  primary: '#4fc5df',
  background: '#172b49',
  surface: '#1e3d6b',
  textAccent: '#4fc5df',
};

function isLowContrastWithWhite(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  const ratio = (1.05) / (L + 0.05);
  return ratio < 4.5;
}

function isTooDark(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  return L > 0.7;
}

export default function BrandIdentityForm({ brandId, initialData }: BrandIdentityFormProps) {
  const t = useTranslations('brand.settings.identity');
  const commonT = useTranslations('brand.settings');
  const onboardingT = useTranslations('onboarding');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { toast: showToast } = useToast();

  const [name, setName] = useState(initialData.name);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialData.logoUrl);
  const [colors, setColors] = useState(initialData.brandColors || DEFAULT_COLORS);
  const [isPending, startTransition] = useTransition();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const colorSlots: ColorSlot[] = useMemo(() => [
    { key: 'primary', label: onboardingT('colorPrimary'), value: colors.primary },
    { key: 'background', label: onboardingT('colorBackground'), value: colors.background },
    { key: 'surface', label: onboardingT('colorSurface'), value: colors.surface },
    { key: 'textAccent', label: onboardingT('colorTextAccent'), value: colors.textAccent },
  ], [colors, onboardingT]);

  const warnings = useMemo(() => {
    const w: Record<string, string> = {};
    if (isLowContrastWithWhite(colors.primary)) {
      w.primary = onboardingT('contrastWarning');
    }
    if (isTooDark(colors.background)) {
      w.background = onboardingT('darkWarning');
    }
    return w;
  }, [colors, onboardingT]);

  function handleColorChange(key: string, value: string) {
    setColors(prev => ({ ...prev, [key]: value }));
  }

  function handleResetColors() {
    setColors(DEFAULT_COLORS);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    const data = { name, logoUrl, brandColors: colors };
    const parsed = brandIdentitySchema.safeParse(data);
    
    if (!parsed.success) {
      const errs = parsed.error.flatten().fieldErrors;
      setFieldErrors(errs);
      showToast(commonT('error'), 'error');
      return;
    }

    startTransition(async () => {
      const result = await updateBrandIdentity(data);

      if (result.success) {
        showToast(commonT('success'), 'success');
      } else {
        showToast(result.error || commonT('error'), 'error');
      }
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-6 backdrop-blur-md"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-[var(--brand-primary)]/10 p-2 text-[var(--brand-primary)]">
          <ImageIcon size={20} strokeWidth={1.5} />
        </div>
        <h2 className={`text-xl font-bold text-[var(--brand-surface-fg)] ${isAr ? 'font-arabic' : ''}`}>
          {t('title')}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Brand Name */}
        <div className="space-y-3">
          <label className={`text-sm font-semibold text-[var(--brand-surface-fg-muted)] ${isAr ? 'font-arabic' : ''}`}>
            {t('name')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full rounded-xl border border-[var(--brand-border)] bg-[var(--brand-background)] ps-4 pe-4 py-3 text-[var(--brand-background-fg)] focus:border-[var(--brand-primary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]/50 ${isAr ? 'font-arabic' : ''}`}
          />
          {fieldErrors.name && (
            <p className="text-xs text-[var(--brand-danger)]">{fieldErrors.name[0]}</p>
          )}
          <div className="flex items-start gap-2 text-[var(--brand-surface-fg-muted)]">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <p className={`text-xs leading-relaxed ${isAr ? 'font-arabic' : ''}`}>
              {t('nameWarning')}
            </p>
          </div>
          <p className={`text-xs text-[var(--brand-surface-fg-muted)] ${isAr ? 'font-arabic' : ''}`}>
            {t('loginUrl', { url: `/brands/${initialData.slug}/login` })}
          </p>
        </div>

        <div className="h-px bg-[var(--brand-border)]" />

        {/* Brand Logo */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className={`text-sm font-semibold text-[var(--brand-surface-fg)] ${isAr ? 'font-arabic' : ''}`}>
              {t('logoTitle')}
            </label>
            <p className={`text-xs text-[var(--brand-surface-fg-muted)] ${isAr ? 'font-arabic' : ''}`}>
              {t('logoDesc')}
            </p>
          </div>
          <LogoUpload
            brandId={brandId}
            logoUrl={logoUrl}
            onUpload={setLogoUrl}
            onRemove={() => setLogoUrl(null)}
          />
        </div>

        <div className="h-px bg-[var(--brand-border)]" />

        {/* Brand Colors */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <label className={`text-sm font-semibold text-[var(--brand-surface-fg)] ${isAr ? 'font-arabic' : ''}`}>
                {t('colorsTitle')}
              </label>
              <p className={`text-xs text-[var(--brand-surface-fg-muted)] ${isAr ? 'font-arabic' : ''}`}>
                {t('colorsDesc')}
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetColors}
              className="flex items-center gap-2 text-xs font-semibold text-[var(--brand-primary)] hover:opacity-80 transition-colors"
            >
              <RefreshCcw size={12} />
              <span className={isAr ? 'font-arabic' : ''}>{t('resetDefaults')}</span>
            </button>
          </div>
          
          <ColorSlotPicker
            slots={colorSlots}
            onChange={handleColorChange}
            warnings={warnings}
          />

          {/* Live Preview */}
          <div className="space-y-3">
            <h3 className={`text-xs font-semibold uppercase tracking-widest text-[var(--brand-surface-fg-muted)] ${isAr ? 'font-arabic' : ''}`}>
              {onboardingT('preview')}
            </h3>
            <div
              className="overflow-hidden rounded-xl border border-[var(--brand-border)] p-4"
              style={{ backgroundColor: colors.background }}
            >
              <div
                className="rounded-lg p-4"
                style={{ backgroundColor: colors.surface }}
              >
                <div className="flex items-center gap-3 mb-3">
                  {logoUrl ? (
                    <Image src={logoUrl} alt="Logo" width={32} height={32} className="h-8 w-8 rounded-lg object-contain" />
                  ) : (
                    <div
                      className="h-8 w-8 rounded-lg"
                      style={{ backgroundColor: colors.primary, opacity: 0.3 }}
                    />
                  )}
                  <span className="text-sm font-bold" style={{ color: colors.textAccent }}>
                    Brand Dashboard
                  </span>
                </div>
                <div className="flex gap-2">
                  <div
                    className="rounded-md ps-3 pe-3 py-1.5 text-xs font-semibold"
                    style={{ backgroundColor: colors.primary, color: isLowContrastWithWhite(colors.primary) ? '#ffffff' : '#000000' }}
                  >
                    Primary Button
                  </div>
                  <div
                    className="rounded-md border ps-3 pe-3 py-1.5 text-xs font-semibold"
                    style={{
                      borderColor: colors.primary,
                      color: colors.primary,
                    }}
                  >
                    Secondary
                  </div>
                </div>
                <div className="mt-3 flex gap-3">
                  <div className="h-2 flex-1 rounded-full opacity-20" style={{ backgroundColor: colors.textAccent }} />
                  <div className="h-2 w-1/3 rounded-full opacity-10" style={{ backgroundColor: colors.textAccent }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] ps-6 pe-6 py-3 font-semibold text-[var(--brand-primary-fg)] transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            <span className={isAr ? 'font-arabic' : ''}>
              {isPending ? t('saving') : t('save')}
            </span>
          </button>
        </div>
      </form>
    </motion.div>
  );
}
