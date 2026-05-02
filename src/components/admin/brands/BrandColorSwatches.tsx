import { useTranslations } from "next-intl";
import { BrandColors } from "@/lib/queries/brands";

type BrandColorSwatchesProps = {
  colors: BrandColors | null;
};

export function BrandColorSwatches({ colors }: BrandColorSwatchesProps) {
  const t = useTranslations("admin.brands.detail");

  if (!colors) return null;

  const slots = [
    { label: t("primary"), value: colors.primary },
    { label: t("background"), value: colors.background },
    { label: t("surface"), value: colors.surface },
    { label: t("textAccent"), value: colors.textAccent },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {slots.map((slot) => (
        <div key={slot.label} className="space-y-1.5">
          <div
            className="h-10 w-full rounded-md border border-white/10 shadow-sm"
            style={{ backgroundColor: slot.value }}
          />
          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              {slot.label}
            </span>
            <span className="text-xs font-mono text-slate-700">
              {slot.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
