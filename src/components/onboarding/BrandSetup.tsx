'use client';

import { useState, useMemo, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { Palette, Loader2, CheckCircle, Image as ImageIcon } from 'lucide-react';
import LogoUpload from './LogoUpload';
import ColorSlotPicker, { type ColorSlot } from './ColorSlotPicker';
import { completeBrandSetup, type BrandColors } from '@/actions/completeBrandSetup';
import { hasLowContrastText } from '@/lib/brandTokens';
import { brandSetupSchema } from '@/lib/validations/brandSetup';

interface BrandSetupProps {
  brandId: string;
  brandSlug: string;
}

// Defaults to the Misdaq palette (black, white, order evidence orange)
const DEFAULT_COLORS: BrandColors = {
  primary: '#FF5B3A',
  background: '#0B0B0B',
  surface: '#FFFFFF',
  textAccent: '#FF5B3A',
};

export default function BrandSetup({ brandId, brandSlug }: BrandSetupProps) {
  const t = useTranslations('onboarding');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const prefersReduced = useReducedMotion();
  const router = useRouter();

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [colors, setColors] = useState<BrandColors>(DEFAULT_COLORS);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const colorSlots: ColorSlot[] = useMemo(() => [
    { key: 'primary', label: t('colorPrimary'), value: colors.primary },
    { key: 'background', label: t('colorBackground'), value: colors.background },
    { key: 'surface', label: t('colorSurface'), value: colors.surface },
    { key: 'textAccent', label: t('colorTextAccent'), value: colors.textAccent },
  ], [colors, t]);

  const warnings = useMemo(() => {
    const w: Record<string, string> = {};
    if (hasLowContrastText(colors.primary)) {
      w.primary = t('contrastWarning');
    }
    if (hasLowContrastText(colors.background)) {
      w.background = t('contrastWarning');
    }
    return w;
  }, [colors, t]);

  function handleColorChange(key: ColorSlot['key'], value: string) {
    const newColors = { ...colors, [key]: value };
    setColors(newColors);

    // On-the-fly validation
    const parsed = brandSetupSchema.safeParse({ brandColors: newColors, logoUrl });
    if (!parsed.success) {
      const errs = parsed.error.flatten().fieldErrors;
      // Zod flattens nested object errors somewhat weirdly, but since we control it:
      setFieldErrors(errs);
    } else {
      setFieldErrors({});
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Full client-side validation before submitting
    const parsed = brandSetupSchema.safeParse({ brandColors: colors, logoUrl });
    if (!parsed.success) {
      setError('Please fix the highlighted errors before continuing.');
      return;
    }

    startTransition(async () => {
      const result = await completeBrandSetup({
        brandColors: colors,
        logoUrl,
      });

      if (result.success) {
        router.push(`/${locale}/brands/${brandSlug}/dashboard`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center gap-4">
        <div className="flex items-center gap-2 rounded-full bg-sky/15 px-4 py-1.5 text-sm font-semibold text-sky">
          <span className="tabular-nums text-xs">1</span>
          <span className={isAr ? 'font-arabic' : ''}>{t('step1')}</span>
        </div>
        <div className="h-px w-8 bg-white/10" />
        <div className="flex items-center gap-2 rounded-full bg-white/[0.04] px-4 py-1.5 text-sm text-white/30">
          <span className="tabular-nums text-xs">2</span>
          <span className={isAr ? 'font-arabic' : ''}>{t('step2')}</span>
        </div>
      </div>

      {/* Main card */}
      <motion.div
        {...(prefersReduced ? {} : {
          initial: { opacity: 0, y: 24 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
        })}
        className="rounded-2xl p-8 sm:p-10"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
        }}
      >
        <div className="mb-8 text-center">
          <h1 className={`text-3xl font-black text-white ${isAr ? 'font-arabic' : ''}`}>
            {t('heading')}
          </h1>
          <p className={`mt-2 text-sm text-white/50 ${isAr ? 'font-arabic' : ''}`}>
            {t('subheading')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Logo Upload */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <ImageIcon size={16} strokeWidth={1.5} className="text-sky" />
              <h2 className={`text-sm font-semibold text-white ${isAr ? 'font-arabic' : ''}`}>
                {t('logoTitle')}
              </h2>
            </div>
            <p className={`mb-4 text-xs text-white/40 ${isAr ? 'font-arabic' : ''}`}>
              {t('logoDesc')}
            </p>
            <LogoUpload
              brandId={brandId}
              logoUrl={logoUrl}
              onUpload={setLogoUrl}
              onRemove={() => setLogoUrl(null)}
            />
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.06]" />

          {/* Color Picker */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Palette size={16} strokeWidth={1.5} className="text-sky" />
              <h2 className={`text-sm font-semibold text-white ${isAr ? 'font-arabic' : ''}`}>
                {t('colorsTitle')}
              </h2>
            </div>
            <p className={`mb-6 text-xs text-white/40 ${isAr ? 'font-arabic' : ''}`}>
              {t('colorsDesc')}
            </p>
            <ColorSlotPicker
              slots={colorSlots}
              onChange={handleColorChange}
              warnings={warnings}
            />
          </div>

          {/* Divider */}
          <div className="h-px bg-white/[0.06]" />

          {/* Live Preview */}
          <div>
            <h3 className={`mb-4 text-xs font-semibold uppercase tracking-widest text-white/40 ${isAr ? 'font-arabic' : ''}`}>
              {t('preview')}
            </h3>
            <div
              className="overflow-hidden rounded-xl border border-white/10 p-4"
              style={{ backgroundColor: colors.background }}
            >
              {/* Mini preview card */}
              <div
                className="rounded-lg p-4"
                style={{ backgroundColor: colors.surface }}
              >
                <div className="flex items-center gap-3 mb-3">
                  {logoUrl ? (
                    <img src={logoUrl} alt="" className="h-8 w-8 rounded-lg object-contain" />
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
                    className="rounded-md px-3 py-1.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: colors.primary }}
                  >
                    Primary Button
                  </div>
                  <div
                    className="rounded-md border px-3 py-1.5 text-xs font-semibold"
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

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-cta px-6 py-4 text-base font-bold text-navy transition-all duration-200 hover:brightness-110 hover:shadow-glow-sky active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 size={18} strokeWidth={1.5} className="animate-spin" />
                <span>{t('completing')}</span>
              </>
            ) : (
              <>
                <CheckCircle size={16} strokeWidth={1.5} />
                <span>{t('completeSetup')}</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
