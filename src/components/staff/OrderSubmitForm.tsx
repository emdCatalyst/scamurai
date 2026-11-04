"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/compressImage";
import { newOrderId, orderDrafts, type OrderDraft, type PendingOrder } from "@/lib/staff/orderStore";
import CameraCaptureZone from "./CameraCaptureZone";
import DeliveryAppPicker from "./DeliveryAppPicker";
import OutboxStatus from "./OutboxStatus";
import SubmitSuccessOverlay from "./SubmitSuccessOverlay";
import { useOutbox } from "./useOutbox";

interface DeliveryApp {
  id: string;
  name: string;
}

interface OrderSubmitFormProps {
  /** Clerk user id of the signed-in staff member. */
  userId: string;
  brandId: string;
  brandSlug: string;
  apps: DeliveryApp[];
}

type Slot = "sealed" | "opened";
interface Photo {
  blob: Blob;
  preview: string;
}

/** How long "Order saved" stays up before the form is ready for the next order. */
const SUCCESS_MS = 900;
const DRAFT_SAVE_MS = 400;

const toPhoto = (blob: Blob): Photo => ({ blob, preview: URL.createObjectURL(blob) });

function persistDraft(draft: OrderDraft) {
  // The delivery app stays selected between orders, so it alone isn't a draft.
  const empty = !draft.orderNumber && !draft.amount && !draft.notes && !draft.sealedBlob && !draft.openedBlob;
  void (empty ? orderDrafts.remove(draft.id) : orderDrafts.save(draft)).catch(() => {});
}

/**
 * The staff order screen. Built so a worker on an old phone never waits:
 * each photo is shrunk right after it is taken, "Submit" only saves the order
 * on the phone (well under a second), and the outbox uploads it in the
 * background. The half-filled form is kept as a draft, because a low-memory
 * phone may kill this page while the camera app is open.
 */
export default function OrderSubmitForm({ userId, brandId, brandSlug, apps }: OrderSubmitFormProps) {
  const t = useTranslations("brand.submit");
  const outbox = useOutbox(userId);
  const draftId = `${userId}:${brandSlug}`;

  const [photos, setPhotos] = useState<Partial<Record<Slot, Photo>>>({});
  const [busy, setBusy] = useState<Partial<Record<Slot, boolean>>>({});
  const [deliveryAppId, setDeliveryAppId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState("");
  const [error, setError] = useState("");

  const photosRef = useRef(photos);
  const draftRef = useRef<OrderDraft | null>(null);
  // Set from submit until reset: no draft may be written for an order already saved.
  const submittingRef = useRef(false);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  // Bring back a draft, e.g. after the phone reloaded the page behind the camera.
  useEffect(() => {
    let cancelled = false;
    orderDrafts
      .get(draftId)
      .then((draft) => {
        if (cancelled || !draft) return;
        setOrderNumber(draft.orderNumber);
        setAmount(draft.amount);
        setNotes(draft.notes);
        if (draft.deliveryAppId) setDeliveryAppId(draft.deliveryAppId);
        setPhotos({
          ...(draft.sealedBlob && { sealed: toPhoto(draft.sealedBlob) }),
          ...(draft.openedBlob && { opened: toPhoto(draft.openedBlob) }),
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [draftId]);

  useEffect(() => {
    if (!ready) return;
    const draft: OrderDraft = {
      id: draftId,
      orderNumber,
      amount,
      notes,
      deliveryAppId,
      sealedBlob: photos.sealed?.blob,
      openedBlob: photos.opened?.blob,
    };
    draftRef.current = draft;
    const timer = setTimeout(() => {
      if (!submittingRef.current) persistDraft(draft);
    }, DRAFT_SAVE_MS);
    return () => clearTimeout(timer);
  }, [ready, draftId, orderNumber, amount, notes, deliveryAppId, photos]);

  // Opening the camera sends this page to the background: save at once.
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden" && draftRef.current && !submittingRef.current) {
        persistDraft(draftRef.current);
      }
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, []);

  useEffect(
    () => () => {
      for (const photo of Object.values(photosRef.current)) if (photo) URL.revokeObjectURL(photo.preview);
    },
    []
  );

  const capture = async (slot: Slot, file: File) => {
    setError("");
    setBusy((b) => ({ ...b, [slot]: true }));
    try {
      const photo = toPhoto(await compressImage(file));
      const previous = photosRef.current[slot];
      setPhotos((current) => ({ ...current, [slot]: photo }));
      if (previous) URL.revokeObjectURL(previous.preview);
    } catch {
      setError(t("photoError"));
    } finally {
      setBusy((b) => ({ ...b, [slot]: false }));
    }
  };

  const resetForm = () => {
    for (const photo of Object.values(photosRef.current)) if (photo) URL.revokeObjectURL(photo.preview);
    setPhotos({});
    setOrderNumber("");
    setAmount("");
    setNotes("");
    setSaving(false);
    setShowSuccess(false);
    submittingRef.current = false;
  };

  const canSubmit =
    Boolean(photos.sealed && photos.opened && deliveryAppId && orderNumber.trim() && amount) &&
    !saving &&
    !busy.sealed &&
    !busy.opened;

  const handleSubmit = async () => {
    if (!canSubmit || !photos.sealed || !photos.opened) return;
    submittingRef.current = true;
    setSaving(true);
    setError("");

    const order: PendingOrder = {
      id: newOrderId(),
      userId,
      brandId,
      brandSlug,
      orderNumber: orderNumber.trim(),
      deliveryAppId,
      subtotal: amount,
      currency: "SAR",
      notes: notes.trim() || undefined,
      sealedBlob: photos.sealed.blob,
      openedBlob: photos.opened.blob,
      createdAt: Date.now(),
      attempts: 0,
    };

    try {
      // Resolves once the order is on the phone's disk; uploading continues in the background.
      await outbox.submit(order);
    } catch {
      submittingRef.current = false;
      setSaving(false);
      setError(t("saveError"));
      return;
    }

    void orderDrafts.remove(draftId).catch(() => {});
    setLastOrderNumber(order.orderNumber);
    setShowSuccess(true);
    setTimeout(resetForm, SUCCESS_MS);
  };

  return (
    <div className="flex flex-col gap-6 p-4 pb-24">
      <SubmitSuccessOverlay isVisible={showSuccess} orderNumber={lastOrderNumber} />

      <OutboxStatus
        waiting={outbox.waiting}
        failed={outbox.failed}
        uploading={outbox.uploading}
        onUploadNow={outbox.uploadNow}
        onRetryFailed={outbox.retryFailed}
      />

      <div className="grid grid-cols-1 gap-4">
        <CameraCaptureZone
          label={t('openedBag')}
          onCapture={(file) => capture("opened", file)}
          previewUrl={photos.opened?.preview}
          busy={busy.opened}
        />
        <CameraCaptureZone
          label={t('sealedBag')}
          onCapture={(file) => capture("sealed", file)}
          previewUrl={photos.sealed?.preview}
          busy={busy.sealed}
        />
      </div>

      <DeliveryAppPicker apps={apps} selectedId={deliveryAppId} onSelect={setDeliveryAppId} />

      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-surface-fg-muted)]">
          {t('orderNumber')}
        </label>
        <input
          type="text"
          placeholder={t('orderNumberPlaceholder')}
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          className="w-full rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-4 text-xl font-bold text-[var(--brand-surface-fg)] outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]"
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
            className="w-full rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-4 text-2xl font-bold text-[var(--brand-surface-fg)] outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]"
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
          {saving ? (
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
