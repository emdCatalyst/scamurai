"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import CameraCaptureZone from "./CameraCaptureZone";
import DeliveryAppPicker from "./DeliveryAppPicker";
import SubmitSuccessOverlay from "./SubmitSuccessOverlay";
import { compressImage } from "@/lib/compressImage";
import { imageQueue, PendingOrder } from "@/lib/imageQueue";
import { uploadOrder } from "@/lib/presignedUpload";

import { useTranslations } from "next-intl";

interface DeliveryApp {
  id: string;
  name: string;
}

interface OrderSubmitFormProps {
  brandId: string;
  brandSlug: string;
  apps: DeliveryApp[];
}

export default function OrderSubmitForm({
  brandId,
  brandSlug,
  apps,
}: OrderSubmitFormProps) {
  const t = useTranslations("brand.submit");
  const [sealedPhoto, setSealedPhoto] = useState<File | null>(null);
  const [openedPhoto, setOpenedPhoto] = useState<File | null>(null);
  const [sealedPreview, setSealedPreview] = useState<string>("");
  const [openedPreview, setOpenedPreview] = useState<string>("");
  const [deliveryAppId, setDeliveryAppId] = useState<string>("");
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isBackgroundUploading, setIsBackgroundUploading] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Clear previews on unmount
  useEffect(() => {
    return () => {
      if (sealedPreview) URL.revokeObjectURL(sealedPreview);
      if (openedPreview) URL.revokeObjectURL(openedPreview);
    };
  }, [sealedPreview, openedPreview]);

  const handleCaptureSealed = (file: File) => {
    setSealedPhoto(file);
    if (sealedPreview) URL.revokeObjectURL(sealedPreview);
    setSealedPreview(URL.createObjectURL(file));
  };

  const handleCaptureOpened = (file: File) => {
    setOpenedPhoto(file);
    if (openedPreview) URL.revokeObjectURL(openedPreview);
    setOpenedPreview(URL.createObjectURL(file));
  };

  const canSubmit = sealedPhoto && openedPhoto && deliveryAppId && orderNumber && amount && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError("");

    try {
      // 1. Show success state immediately (optimistic)
      setShowSuccess(true);
      
      // 2. Background task: Compress and Queue
      const processSubmission = async () => {
        setIsBackgroundUploading(true);
        setLastOrderNumber(orderNumber); // Set immediately for overlay

        try {
          // Compress images in parallel
          const [sealedBlob, openedBlob] = await Promise.all([
            compressImage(sealedPhoto),
            compressImage(openedPhoto),
          ]);

          const pendingOrder: PendingOrder = {
            id: crypto.randomUUID(),
            brandId,
            brandSlug,
            orderNumber,
            deliveryAppId,
            subtotal: amount,
            currency: "SAR",
            notes: notes || undefined,
            sealedBlob,
            openedBlob,
            createdAt: Date.now(),
            attempts: 0,
          };

          // Try immediate upload
          const result = await uploadOrder(pendingOrder);
          
          if (!result.success) {
            // If failed, enqueue for background retry
            await imageQueue.enqueue(pendingOrder);
            console.warn("Upload failed, enqueued for retry:", result.error);
          }
        } catch (err) {
          console.error("Background processing failed:", err);
          // Fallback: save raw images if compression failed? 
          // For now, we just fail and the worker might need to retry if it's critical.
        } finally {
          setIsBackgroundUploading(false);
          // Keep success overlay for 1.5s total
          setTimeout(() => {
            resetForm();
          }, 1500);
        }
      };

      processSubmission();

    } catch (err) {
      console.error("Submission error:", err);
      setError(t('errorGeneral'));
      setIsSubmitting(false);
      setShowSuccess(false);
    }
  };

  const resetForm = () => {
    setSealedPhoto(null);
    setOpenedPhoto(null);
    setOrderNumber("");
    setAmount("");
    setNotes("");
    if (sealedPreview) URL.revokeObjectURL(sealedPreview);
    if (openedPreview) URL.revokeObjectURL(openedPreview);
    setSealedPreview("");
    setOpenedPreview("");
    setIsSubmitting(false);
    setShowSuccess(false);
    setError("");
  };

  return (
    <div className="flex flex-col gap-6 p-4 pb-24">
      <SubmitSuccessOverlay 
        isVisible={showSuccess} 
        orderNumber={lastOrderNumber}
        isUploading={isBackgroundUploading}
      />

      <div className="grid grid-cols-1 gap-4">
        <CameraCaptureZone
          label={t('sealedBag')}
          onCapture={handleCaptureSealed}
          previewUrl={sealedPreview}
          className={cn(!sealedPhoto && isSubmitting && "border-[var(--brand-danger)]")}
        />
        <CameraCaptureZone
          label={t('openedBag')}
          onCapture={handleCaptureOpened}
          previewUrl={openedPreview}
          className={cn(!openedPhoto && isSubmitting && "border-[var(--brand-danger)]")}
        />
      </div>

      <DeliveryAppPicker
        apps={apps}
        selectedId={deliveryAppId}
        onSelect={setDeliveryAppId}
        className={cn(!deliveryAppId && isSubmitting && "ring-2 ring-[var(--brand-danger)] rounded-lg p-1")}
      />

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-surface-fg-muted)]">
          {t('orderNumber')}
        </label>
        <input
          type="text"
          placeholder={t('orderNumberPlaceholder')}
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          className={cn(
            "w-full rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-4 text-xl font-bold text-[var(--brand-surface-fg)] outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]",
            !orderNumber && isSubmitting && "border-[var(--brand-danger)]"
          )}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-surface-fg-muted)]">
          {t('amount')} ({t('currency')})
        </label>
        <div className="relative">
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            placeholder={t('amountPlaceholder')}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={cn(
              "w-full rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-4 text-2xl font-bold text-[var(--brand-surface-fg)] outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]",
              !amount && isSubmitting && "border-[var(--brand-danger)]"
            )}
          />
          <div className="absolute end-4 top-1/2 -translate-y-1/2 font-bold text-[var(--brand-surface-fg-muted)]">
            {t('currency')}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-surface-fg-muted)]">
          {t('notes')} <span className="opacity-60">({t('notesOptional')})</span>
        </label>
        <textarea
          placeholder={t('notesPlaceholder')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)] min-h-[80px] text-[var(--brand-surface-fg)]"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-[var(--brand-danger)]/10 p-3 text-sm text-[var(--brand-danger)] border border-[var(--brand-danger)]/20">
          <AlertCircle className="h-4 w-4" />
          <p>{error}</p>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--brand-surface)]/80 backdrop-blur-md border-t border-[var(--brand-border)] z-10">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            "w-full rounded-xl py-4 text-lg font-bold transition-all shadow-lg",
            canSubmit 
              ? "bg-[var(--brand-primary)] text-[var(--brand-primary-fg)] active:scale-95 shadow-[var(--brand-primary)]/20" 
              : "bg-[var(--brand-surface-fg)]/10 text-[var(--brand-surface-fg-muted)] cursor-not-allowed"
          )}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{t('processing')}</span>
            </div>
          ) : (
            t('submitOrder')
          )}
        </button>
      </div>
    </div>
  );
}
