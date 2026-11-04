"use client";

import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { AlertTriangle, Camera, Eye, Loader2, RefreshCw } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import ImageLightbox from "@/components/brand/orders/ImageLightbox";

import { useTranslations } from "next-intl";

interface CameraCaptureZoneProps {
  label: string;
  onCapture: (file: File) => void;
  /** Just before the camera opens: a low-memory phone may close this page while it is open. */
  onOpenCamera?: () => void;
  /** The worker closed the camera without a photo (where the browser says so). */
  onCameraCancel?: () => void;
  previewUrl?: string;
  /** The photo is being shrunk for upload. */
  busy?: boolean;
  disabled?: boolean;
  /** Why there is no photo, e.g. it couldn't be read. */
  error?: string;
  /** A doubt about the photo, e.g. it looks older than this order. */
  warning?: string;
  /** The worker tried to save without this photo. */
  highlighted?: boolean;
  /** Id of the tile's main control, so the form can bring the worker to it. */
  id?: string;
  className?: string;
}

/**
 * One photo of the order. Empty, the whole tile opens the camera; with a
 * photo, a tap on it shows it full screen, and Retake (here or there) takes
 * it again. Messages stay inside the tile, which never changes size, so the
 * next tile can't move under the worker's finger.
 */
export default function CameraCaptureZone({
  label,
  onCapture,
  onOpenCamera,
  onCameraCancel,
  previewUrl,
  busy = false,
  disabled = false,
  error,
  warning,
  highlighted = false,
  id,
  className,
}: CameraCaptureZoneProps) {
  const t = useTranslations("brand.submit");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reviewing, setReviewing] = useState(false);
  const warningId = useId();
  const cancelled = useEffectEvent(() => onCameraCancel?.());

  // React has no prop for a file input's "cancel" (Chrome 113+, Safari 16.4+).
  useEffect(() => {
    const input = fileInputRef.current;
    const listener = () => cancelled();
    input?.addEventListener("cancel", listener);
    return () => input?.removeEventListener("cancel", listener);
  }, []);

  const openCamera = () => {
    onOpenCamera?.();
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Clear the input so the next shot always fires a change, even if identical.
    e.target.value = "";
    if (file) {
      onCapture(file);
    }
  };

  return (
    <>
      <div
        className={cn(
          "relative h-32 w-full overflow-hidden rounded-xl border-2",
          previewUrl ? "border-mint" : "border-dashed border-[var(--brand-surface-fg-muted)] bg-[var(--brand-surface)]",
          highlighted && "ring-2 ring-[var(--brand-danger)] ring-offset-2",
          className
        )}
      >
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          tabIndex={-1}
          aria-hidden
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        {busy ? (
          <div id={id} tabIndex={-1} className="flex h-full flex-col items-center justify-center gap-2 text-[var(--brand-surface-fg-muted)] outline-none">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
            <span className="text-sm font-medium">{t('preparingPhoto')}</span>
          </div>
        ) : previewUrl ? (
          <>
            <button
              type="button"
              id={id}
              onClick={() => setReviewing(true)}
              aria-label={`${t('review')}: ${label}`}
              aria-describedby={warning ? warningId : undefined}
              className="absolute inset-0 h-full w-full"
            >
              <Image src={previewUrl} alt="" fill className="object-cover" />
              {/* Shows that a tap opens the photo. */}
              <span className="absolute bottom-2 start-2 flex min-h-8 items-center gap-1 rounded-full bg-[var(--brand-surface)] px-3 text-xs font-semibold text-[var(--brand-surface-fg)] shadow-sm">
                <Eye className="h-4 w-4" aria-hidden />
                {t('review')}
              </span>
            </button>
            {/* Solid black, not an opacity modifier: older phones' browsers would drop it and leave white text on the photo. */}
            {warning ? (
              <p
                id={warningId}
                className="pointer-events-none absolute inset-x-2 top-2 flex items-start gap-1.5 rounded-md bg-black px-2 py-1 text-xs font-medium text-white"
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="line-clamp-2">{warning}</span>
              </p>
            ) : (
              <span className="pointer-events-none absolute start-2 top-2 rounded-md bg-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                {label}
              </span>
            )}
            <button
              type="button"
              onClick={openCamera}
              disabled={disabled}
              className="absolute bottom-2 end-2 flex min-h-11 items-center gap-1.5 rounded-full bg-[var(--brand-surface)] px-4 text-sm font-semibold text-[var(--brand-surface-fg)] shadow-sm"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              {t('retake')}
            </button>
          </>
        ) : (
          <button
            type="button"
            id={id}
            onClick={openCamera}
            disabled={disabled}
            className="flex h-full w-full flex-col items-center justify-center gap-1 px-3 text-[var(--brand-surface-fg-muted)]"
          >
            <Camera className="h-8 w-8" aria-hidden />
            <span className="text-sm font-medium">{label}</span>
            {error && <span className="line-clamp-2 text-xs font-semibold text-[var(--brand-danger)]">{error}</span>}
          </button>
        )}
      </div>

      <ImageLightbox
        src={reviewing && previewUrl ? previewUrl : null}
        alt={label}
        onClose={() => setReviewing(false)}
        onRetake={openCamera}
        closeOnBack
      />
    </>
  );
}
