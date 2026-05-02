"use client";

import { useRef } from "react";
import { Camera, RefreshCw } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

import { useTranslations } from "next-intl";

interface CameraCaptureZoneProps {
  label: string;
  onCapture: (file: File) => void;
  previewUrl?: string;
  className?: string;
}

export default function CameraCaptureZone({
  label,
  onCapture,
  previewUrl,
  className,
}: CameraCaptureZoneProps) {
  const t = useTranslations("brand.submit");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onCapture(file);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "relative flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all",
        previewUrl 
          ? "border-mint bg-mint/5" 
          : "border-[var(--brand-border)] bg-[var(--brand-surface)] hover:bg-[var(--brand-background-active)]/5",
        className
      )}
    >
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {previewUrl ? (
        <div className="relative h-full w-full overflow-hidden rounded-lg">
          <Image
            src={previewUrl}
            alt={label}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute bottom-2 end-2">
            <button
              type="button"
              className="flex items-center gap-1 rounded-full bg-[var(--brand-surface)]/90 px-3 py-1 text-xs font-medium text-[var(--brand-surface-fg)] shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              <RefreshCw className="h-3 w-3" />
              {t('retake')}
            </button>
          </div>
          <div className="absolute start-3 top-3 rounded-md bg-black/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
            {label}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-[var(--brand-surface-fg-muted)]">
          <Camera className="h-8 w-8" />
          <span className="text-sm font-medium">{label}</span>
        </div>
      )}
    </div>
  );
}
