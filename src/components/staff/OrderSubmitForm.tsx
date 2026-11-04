"use client";

import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { AlertCircle, Info, Loader2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/compressImage";
import { toLatinDigits } from "@/lib/digits";
import { formatAmount, normalizeOrderNumber, NOTES_MAX_LENGTH, ORDER_NUMBER_MAX_LENGTH, parseAmount } from "@/lib/orders/input";
import type { LocalDbProblem } from "@/lib/staff/localDb";
import { newOrderId, orderDrafts } from "@/lib/staff/orderStore";
import { withTimeout } from "@/lib/staff/timeout";
import CameraCaptureZone from "./CameraCaptureZone";
import DeliveryAppPicker from "./DeliveryAppPicker";
import OutboxStatus from "./OutboxStatus";
import SubmitSuccessOverlay from "./SubmitSuccessOverlay";
import UnfinishedOrderPrompt from "./UnfinishedOrderPrompt";
import {
  amountPreview,
  draftFromOrder,
  DRAFT_FRESH_MS,
  failedReason,
  fieldsToFix,
  hasOrder,
  isFresh,
  isOldPhoto,
  missingItem,
  orderFromForm,
  type Correction,
  type FormDraft,
  type MissingItem,
  type Slot,
} from "./orderForm";
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
  /** The brand's delivery apps that are turned on. */
  apps: DeliveryApp[];
}

interface Photo {
  blob: Blob;
  preview: string;
}

/** A message in a photo tile: why there is no photo, or a doubt about the one there. */
interface PhotoNote {
  kind: "error" | "warning";
  text: string;
}

/** How long "Order saved" stays up (a tap skips it) before the form is ready for the next order. */
const SUCCESS_MS = 1_500;
const DRAFT_SAVE_MS = 400;
/** A photo still not shrunk by then won't be: the worker is asked to take it again rather than wait. */
const PHOTO_PREPARE_MS = 30_000;

const toPhoto = (blob: Blob): Photo => ({ blob, preview: URL.createObjectURL(blob) });
const blobOf = (draft: FormDraft, slot: Slot) => (slot === "sealed" ? draft.sealedBlob : draft.openedBlob);

function persistDraft(draft: FormDraft) {
  // The delivery app alone is kept as well: the next order, after a reload too, starts with it.
  const empty = !hasOrder(draft) && !draft.deliveryAppId && !draft.capturing;
  void (empty ? orderDrafts.remove(draft.id) : orderDrafts.save(draft)).catch(() => {});
}

const FIELD =
  "w-full rounded-xl border border-[var(--brand-surface-fg-muted)] bg-[var(--brand-surface)] px-4 text-[var(--brand-surface-fg)] outline-none focus:border-[var(--brand-primary)] focus:ring-1 focus:ring-[var(--brand-primary)]";
const FIELD_INVALID = "border-[var(--brand-danger)] ring-1 ring-[var(--brand-danger)]";
const LABEL = "text-xs font-semibold uppercase tracking-wider text-[var(--brand-surface-fg-muted)]";

/**
 * The staff order screen. Built so a worker on an old phone never waits:
 * each photo is shrunk right after it is taken, "Save" only saves the order
 * on the phone (well under a second), and the outbox uploads it in the
 * background. The half-filled form is kept as a draft, because a low-memory
 * phone may kill this page while the camera app is open.
 *
 * Nothing above the photo tiles appears or goes away by itself, so they
 * never move under the worker's finger; the Save button stays tappable and
 * says what is still missing.
 */
export default function OrderSubmitForm({ userId, brandId, brandSlug, apps }: OrderSubmitFormProps) {
  const t = useTranslations("brand.submit");
  const format = useFormatter();
  const outbox = useOutbox(userId);
  const draftId = `${userId}:${brandSlug}`;
  const fid = useId();
  const ids = {
    correction: `${fid}correction`,
    opened: `${fid}opened`,
    sealed: `${fid}sealed`,
    app: `${fid}app`,
    orderNumber: `${fid}number`,
    amount: `${fid}amount`,
    amountHint: `${fid}amount-hint`,
    notes: `${fid}notes`,
  };

  const [photos, setPhotos] = useState<Partial<Record<Slot, Photo>>>({});
  const [busy, setBusy] = useState<Partial<Record<Slot, boolean>>>({});
  const [photoNotes, setPhotoNotes] = useState<Partial<Record<Slot, PhotoNote>>>({});
  // A brand with one delivery app has it chosen already.
  const [deliveryAppId, setDeliveryAppId] = useState(() => (apps.length === 1 ? apps[0].id : ""));
  const [orderNumber, setOrderNumber] = useState("");
  const [amount, setAmount] = useState("");
  /** The worker left the amount, or tried to save: say if it can't be read (not while it's being typed). */
  const [amountChecked, setAmountChecked] = useState(false);
  const [notes, setNotes] = useState("");
  const [correcting, setCorrecting] = useState<Correction>();
  const [restored, setRestored] = useState(false);
  /** An order left for long: asked about before the form shows it. */
  const [held, setHeld] = useState<{ when?: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ orderNumber: string; problem?: LocalDbProblem } | null>(null);
  const [lastSaved, setLastSaved] = useState<{ orderNumber: string; at: number }>();
  /** What the worker was pointed at after tapping Save too early. */
  const [attention, setAttention] = useState<MissingItem | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [alertText, setAlertText] = useState("");

  const photosRef = useRef(photos);
  const draftRef = useRef<FormDraft | null>(null);
  // Set from save until reset: no draft may be written for an order already saved.
  const submittingRef = useRef(false);
  /** When the worker last changed the order. */
  const editedAtRef = useRef(0);
  /** The next draft write comes from bringing a draft back: it keeps that draft's time. */
  const keepTimeRef = useRef(false);
  /** The photo whose camera is open. */
  const capturingRef = useRef<Slot | undefined>(undefined);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const titleRef = useRef<HTMLHeadingElement>(null);
  /** Counts the orders the form has held: a photo still being shrunk for an earlier one is dropped. */
  const formRunRef = useRef(0);

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  /** Fills the form from a draft. A delivery app the brand no longer offers isn't taken. */
  const applyDraft = (draft: FormDraft) => {
    formRunRef.current++;
    for (const photo of Object.values(photosRef.current)) if (photo) URL.revokeObjectURL(photo.preview);
    const restoredPhotos = {
      ...(draft.sealedBlob && { sealed: toPhoto(draft.sealedBlob) }),
      ...(draft.openedBlob && { opened: toPhoto(draft.openedBlob) }),
    };
    photosRef.current = restoredPhotos;
    setPhotos(restoredPhotos);
    setOrderNumber(draft.orderNumber);
    setAmount(draft.amount);
    setNotes(draft.notes);
    setDeliveryAppId(
      apps.some((app) => app.id === draft.deliveryAppId) ? draft.deliveryAppId : apps.length === 1 ? apps[0].id : ""
    );
    setCorrecting(draft.correcting);
  };

  // Bring back a draft, e.g. after the phone reloaded the page behind the camera.
  const restoreDraft = useEffectEvent((draft: FormDraft) => {
    const now = Date.now();
    const fresh = isFresh(draft, now);
    keepTimeRef.current = true;
    editedAtRef.current = draft.savedAt ?? 0;
    applyDraft(draft);
    // The camera was open when the page went: the photo it took never arrived.
    const lost = draft.capturing;
    // A retake keeps the earlier photo, so the note then sits over it.
    if (fresh && lost) setPhotoNotes({ [lost]: { kind: blobOf(draft, lost) ? "warning" : "error", text: t("photoLost") } });
    if (!hasOrder(draft)) return;
    if (fresh) setRestored(true);
    else setHeld({ when: draft.savedAt ? format.relativeTime(draft.savedAt, now) : undefined });
  });

  useEffect(() => {
    let cancelled = false;
    orderDrafts
      .get(draftId)
      .then((draft) => {
        if (!cancelled && draft) restoreDraft(draft as FormDraft);
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
    if (keepTimeRef.current) keepTimeRef.current = false;
    else editedAtRef.current = Date.now();
    const draft: FormDraft = {
      id: draftId,
      orderNumber,
      amount,
      notes,
      deliveryAppId,
      sealedBlob: photos.sealed?.blob,
      openedBlob: photos.opened?.blob,
      // Unknown for a draft saved before its time was kept; it stays unknown until the worker changes it.
      savedAt: editedAtRef.current || undefined,
      capturing: capturingRef.current,
      correcting,
    };
    draftRef.current = draft;
    const timer = setTimeout(() => {
      if (!submittingRef.current) persistDraft(draft);
    }, DRAFT_SAVE_MS);
    return () => clearTimeout(timer);
  }, [ready, draftId, orderNumber, amount, notes, deliveryAppId, photos, correcting]);

  /** The camera closed with this page still open: whatever it took arrives here, nothing was lost. */
  const cameraClosed = () => {
    capturingRef.current = undefined;
    const draft = draftRef.current;
    if (draft?.capturing && !submittingRef.current) {
      draftRef.current = { ...draft, capturing: undefined };
      persistDraft(draftRef.current);
    }
  };

  const onVisibilityChange = useEffectEvent(() => {
    const draft = draftRef.current;
    if (document.visibilityState === "hidden") {
      // Opening the camera sends this page to the background, where the phone may close it: save at once.
      if (draft && !submittingRef.current) persistDraft({ ...draft, capturing: capturingRef.current });
      return;
    }
    if (capturingRef.current) cameraClosed();
    // An installed app stays open for hours: the order on screen may be of a bag long gone. Opening the
    // camera counts as a change, so coming back from it doesn't ask.
    const now = Date.now();
    if (draft && !held && !submittingRef.current && hasOrder(draft) && now - editedAtRef.current > DRAFT_FRESH_MS) {
      setHeld({ when: format.relativeTime(editedAtRef.current, now) });
    }
  });

  useEffect(() => {
    const listener = () => onVisibilityChange();
    document.addEventListener("visibilitychange", listener);
    return () => document.removeEventListener("visibilitychange", listener);
  }, []);

  useEffect(
    () => () => {
      for (const photo of Object.values(photosRef.current)) if (photo) URL.revokeObjectURL(photo.preview);
    },
    []
  );

  const openingCamera = (slot: Slot) => {
    capturingRef.current = slot;
    editedAtRef.current = Date.now();
    const draft = draftRef.current;
    if (draft && !submittingRef.current) {
      draftRef.current = { ...draft, capturing: slot, savedAt: editedAtRef.current };
      persistDraft(draftRef.current);
    }
  };

  const capture = async (slot: Slot, file: File) => {
    if (capturingRef.current === slot) capturingRef.current = undefined;
    const now = Date.now();
    const run = formRunRef.current;
    setPhotoNotes((current) => ({ ...current, [slot]: undefined }));
    setBusy((b) => ({ ...b, [slot]: true }));
    try {
      const blob = await withTimeout(compressImage(file), PHOTO_PREPARE_MS, () => new Error("Preparing the photo took too long"));
      // The form was cleared, saved or refilled meanwhile: this photo belongs to no order now.
      if (run !== formRunRef.current) return;
      const photo = toPhoto(blob);
      const previous = photosRef.current[slot];
      setPhotos((current) => ({ ...current, [slot]: photo }));
      if (previous) URL.revokeObjectURL(previous.preview);
      // Made long before it was chosen: maybe an old photo from the gallery. Said, not refused.
      if (isOldPhoto(file.lastModified, now)) {
        const text = t("oldPhoto", { when: format.relativeTime(file.lastModified, now) });
        setPhotoNotes((current) => ({ ...current, [slot]: { kind: "warning", text } }));
        setAnnouncement(text);
      }
    } catch {
      if (run !== formRunRef.current) return;
      setPhotoNotes((current) => ({ ...current, [slot]: { kind: "error", text: t("photoError") } }));
      setAlertText(t("photoError"));
    } finally {
      setBusy((b) => ({ ...b, [slot]: false }));
    }
  };

  const resetForm = () => {
    formRunRef.current++;
    clearTimeout(resetTimerRef.current);
    for (const photo of Object.values(photosRef.current)) if (photo) URL.revokeObjectURL(photo.preview);
    photosRef.current = {};
    setPhotos({});
    setPhotoNotes({});
    setOrderNumber("");
    setAmount("");
    setAmountChecked(false);
    setNotes("");
    setCorrecting(undefined);
    setRestored(false);
    setHeld(null);
    setAttention(null);
    setSaving(false);
    setSaved(null);
    submittingRef.current = false;
  };

  /** What stays on the phone once an order is saved or cleared: the delivery app, for the next one. */
  const keepOnlyApp = () => {
    editedAtRef.current = Date.now();
    persistDraft({ id: draftId, orderNumber: "", amount: "", notes: "", deliveryAppId, savedAt: editedAtRef.current });
  };

  const formHoldsOrder = hasOrder({
    orderNumber,
    amount,
    notes,
    sealedBlob: photos.sealed?.blob,
    openedBlob: photos.opened?.blob,
    correcting,
  });

  const clearForm = () => {
    // A refused order being corrected stays in the outbox's list: only the changes go.
    if (!window.confirm(t(correcting ? "stopCorrecting" : "clearConfirm"))) return;
    resetForm();
    keepOnlyApp();
  };

  const missing = missingItem({
    wrongAccount: outbox.wrongAccount,
    preparing: Boolean(busy.sealed || busy.opened),
    opened: Boolean(photos.opened),
    sealed: Boolean(photos.sealed),
    apps,
    deliveryAppId,
    orderNumber,
    amount,
  });
  // Only while it is still the thing missing.
  const highlight = attention !== null && attention === missing ? attention : null;

  const MISSING_TARGET: Partial<Record<MissingItem, string>> = {
    needOpenedPhoto: ids.opened,
    needSealedPhoto: ids.sealed,
    needDeliveryApp: ids.app,
    needOrderNumber: ids.orderNumber,
    orderNumberInvalid: ids.orderNumber,
    needAmount: ids.amount,
    amountInvalid: ids.amount,
  };

  /** Brings the worker to what is missing; the Save button already says what it is. */
  const pointAt = (item: MissingItem) => {
    setAttention(item);
    if (item === "amountInvalid") setAmountChecked(true);
    setAnnouncement(t(item));
    const target = document.getElementById(MISSING_TARGET[item] ?? "");
    target?.scrollIntoView({ block: "center" });
    target?.focus({ preventScroll: true });
  };

  const finishSaving = () => {
    resetForm();
    window.scrollTo(0, 0);
    titleRef.current?.focus({ preventScroll: true });
  };

  const handleSave = async () => {
    if (saving) return;
    if (missing) {
      pointAt(missing);
      return;
    }
    if (!photos.sealed || !photos.opened) return;
    submittingRef.current = true;
    setSaving(true);

    const correction = correcting;
    // A corrected order leaves the list of refused ones now, and is saved again under its own id. If that copy
    // isn't refused any more (sent again meanwhile), a new id keeps its upload from removing this one.
    const taken = correction ? await outbox.takeBack(correction.id).catch(() => undefined) : undefined;
    const order = orderFromForm(
      { orderNumber, amount, notes, deliveryAppId, sealedBlob: photos.sealed.blob, openedBlob: photos.opened.blob },
      { userId, brandId, brandSlug },
      { id: taken?.id ?? newOrderId(), createdAt: correction?.createdAt ?? Date.now() }
    );
    if (!order) {
      // Not reached: `missing` already checked the amount.
      submittingRef.current = false;
      setSaving(false);
      return;
    }

    // Resolves once the order is on the phone's disk, or kept by this page; uploading continues in the background.
    const result = await outbox.submit(order);
    // Nothing of this order may come back as a draft.
    keepOnlyApp();
    setLastSaved({ orderNumber: order.orderNumber, at: Date.now() });
    setAnnouncement(t("savedAnnouncement", { number: order.orderNumber }));
    setSaved({ orderNumber: order.orderNumber, problem: result.onPhone ? undefined : result.problem });
    // Kept by this page only: the worker reads why, and taps OK.
    if (result.onPhone) resetTimerRef.current = setTimeout(finishSaving, SUCCESS_MS);
  };

  const editRefused = (id: string) => {
    const order = outbox.failed.find((candidate) => candidate.id === id);
    if (!order) return;
    if (formHoldsOrder || held) {
      window.alert(t("editBusy"));
      return;
    }
    // The refused order stays in the outbox until the corrected one is saved, so clearing the
    // form or signing out meanwhile loses nothing.
    applyDraft(draftFromOrder(order, draftId, Date.now()));
    setPhotoNotes({});
    setRestored(false);
    setAttention(null);
    window.scrollTo(0, 0);
    titleRef.current?.focus({ preventScroll: true });
  };

  const removeRefused = async (id: string) => {
    const order = outbox.failed.find((candidate) => candidate.id === id);
    if (!order || !window.confirm(t("removeConfirm", { number: order.orderNumber }))) return false;
    const removed = await outbox.discard(id).catch(() => false);
    if (removed && correcting?.id === id) {
      resetForm();
      keepOnlyApp();
    }
    return removed;
  };

  const continueHeld = () => {
    editedAtRef.current = Date.now();
    if (draftRef.current) {
      draftRef.current = { ...draftRef.current, savedAt: editedAtRef.current };
      persistDraft(draftRef.current);
    }
    setHeld(null);
    setRestored(true);
  };

  const toFix = fieldsToFix(correcting);
  const parsedAmount = parseAmount(amount);
  const amountUnreadable = amount.trim() !== "" && parsedAmount === null;
  const showAmountError = amountUnreadable && (amountChecked || highlight === "amountInvalid");
  const amountInvalid = showAmountError || highlight === "needAmount" || toFix.has("subtotal");
  const savedAs = amountUnreadable ? null : amountPreview(amount);
  const numberInvalid = highlight === "needOrderNumber" || highlight === "orderNumberInvalid" || toFix.has("orderNumber");
  const appName = apps.find((app) => app.id === deliveryAppId)?.name ?? "";
  const summary =
    missing === null && parsedAmount !== null
      ? t("readySummary", { app: appName, number: normalizeOrderNumber(orderNumber), amount: formatAmount(parsedAmount) })
      : "";
  const title = correcting
    ? t("correctingOrder", { number: correcting.orderNumber })
    : restored && formHoldsOrder
      ? t("restoredOrder")
      : t("newOrder");
  const noteOf = (slot: Slot, kind: PhotoNote["kind"]) => (photoNotes[slot]?.kind === kind ? photoNotes[slot]?.text : undefined);

  return (
    <div className="flex flex-col gap-4 p-4 pb-32">
      <p role="status" className="sr-only">
        {announcement}
      </p>
      <p role="alert" className="sr-only">
        {alertText}
      </p>

      <SubmitSuccessOverlay
        isVisible={saved !== null}
        orderNumber={saved?.orderNumber}
        problem={saved?.problem && t(`saveProblem.${saved.problem}`)}
        unsaved={outbox.unsaved}
        onDismiss={finishSaving}
      />

      <OutboxStatus
        waiting={outbox.waiting}
        failed={outbox.failed}
        uploading={outbox.uploading}
        unsaved={outbox.unsaved}
        wrongAccount={outbox.wrongAccount}
        checked={outbox.checked}
        apps={apps}
        editingId={correcting?.id}
        onUploadNow={outbox.uploadNow}
        onRetryFailed={outbox.retryFailed}
        onEdit={editRefused}
        onRemove={removeRefused}
      />

      {held ? (
        <UnfinishedOrderPrompt
          when={held.when}
          orderNumber={normalizeOrderNumber(orderNumber)}
          photos={[photos.opened?.preview, photos.sealed?.preview].filter((url): url is string => Boolean(url))}
          onContinue={continueHeld}
          onDiscard={clearForm}
        />
      ) : (
        <>
          {/* A fixed height: what it says changes, never the place of the tiles below. */}
          <div className="flex h-11 items-center justify-between gap-3">
            <h2 ref={titleRef} tabIndex={-1} className="min-w-0 truncate text-base font-bold outline-none">
              {title}
            </h2>
            {formHoldsOrder ? (
              <button
                type="button"
                onClick={clearForm}
                className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-semibold text-[var(--brand-danger)]"
              >
                {correcting ? t("cancelCorrection") : t("clearForm")}
              </button>
            ) : (
              lastSaved && (
                <span className="min-w-0 truncate text-xs text-[var(--brand-surface-fg-muted)]">
                  {t("lastSaved", {
                    number: lastSaved.orderNumber,
                    time: format.dateTime(lastSaved.at, { hour: "numeric", minute: "2-digit" }),
                  })}
                </span>
              )
            )}
          </div>

          {correcting && (
            <p
              id={ids.correction}
              className="flex items-start gap-2 rounded-xl border border-[var(--brand-danger-line)] bg-[var(--brand-danger-soft)] p-3 text-sm font-medium text-[var(--brand-surface-fg)]"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-danger)]" aria-hidden />
              {t(`failedReason.${failedReason(correcting.errorCode)}`)}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4">
            <CameraCaptureZone
              id={ids.opened}
              label={t('openedBag')}
              onCapture={(file) => capture("opened", file)}
              onOpenCamera={() => openingCamera("opened")}
              onCameraCancel={cameraClosed}
              previewUrl={photos.opened?.preview}
              busy={busy.opened}
              disabled={!ready}
              error={noteOf("opened", "error")}
              warning={noteOf("opened", "warning")}
              highlighted={highlight === "needOpenedPhoto"}
            />
            <CameraCaptureZone
              id={ids.sealed}
              label={t('sealedBag')}
              onCapture={(file) => capture("sealed", file)}
              onOpenCamera={() => openingCamera("sealed")}
              onCameraCancel={cameraClosed}
              previewUrl={photos.sealed?.preview}
              busy={busy.sealed}
              disabled={!ready}
              error={noteOf("sealed", "error")}
              warning={noteOf("sealed", "warning")}
              highlighted={highlight === "needSealedPhoto"}
            />
          </div>

          <DeliveryAppPicker
            id={ids.app}
            apps={apps}
            selectedId={deliveryAppId}
            onSelect={setDeliveryAppId}
            disabled={!ready}
            invalid={highlight === "needDeliveryApp" || toFix.has("deliveryAppId")}
            describedBy={toFix.has("deliveryAppId") ? ids.correction : undefined}
          />

          <div className="flex flex-col gap-2">
            <label htmlFor={ids.orderNumber} className={LABEL}>
              {t('orderNumber')}
            </label>
            <input
              id={ids.orderNumber}
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              maxLength={ORDER_NUMBER_MAX_LENGTH}
              placeholder={t('orderNumberPlaceholder')}
              value={orderNumber}
              disabled={!ready}
              aria-invalid={numberInvalid || undefined}
              aria-describedby={toFix.has("orderNumber") ? ids.correction : undefined}
              // Arabic keyboards type ٠-٩: shown as the Latin digits the delivery apps and finance use.
              onChange={(e) => setOrderNumber(toLatinDigits(e.target.value))}
              className={cn(FIELD, "py-4 text-xl font-bold", numberInvalid && FIELD_INVALID)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={ids.amount} className={LABEL}>
              {t('amount')} ({t('currency')})
            </label>
            <div className="relative">
              {/* Text, not type="number": Chrome drops "," and "٫" and Arabic digits from number fields, so 37,95 became 3795. */}
              <input
                id={ids.amount}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                enterKeyHint="done"
                placeholder={t('amountPlaceholder')}
                value={amount}
                disabled={!ready}
                aria-invalid={amountInvalid || undefined}
                aria-describedby={
                  showAmountError || savedAs ? ids.amountHint : toFix.has("subtotal") ? ids.correction : undefined
                }
                onChange={(e) => setAmount(toLatinDigits(e.target.value))}
                onBlur={() => setAmountChecked(true)}
                className={cn(FIELD, "py-4 pe-16 text-2xl font-bold", amountInvalid && FIELD_INVALID)}
              />
              <div className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 font-bold text-[var(--brand-surface-fg-muted)]">
                {t('currency')}
              </div>
            </div>
            {showAmountError ? (
              <p id={ids.amountHint} className="text-sm font-semibold text-[var(--brand-danger)]">
                {t("amountInvalid")}
              </p>
            ) : (
              savedAs && (
                <p id={ids.amountHint} className="text-sm text-[var(--brand-surface-fg-muted)]">
                  {t("amountSavedAs", { amount: savedAs })}
                </p>
              )
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={ids.notes} className={LABEL}>
              {t('notes')} <span className="opacity-60">({t('notesOptional')})</span>
            </label>
            <textarea
              id={ids.notes}
              maxLength={NOTES_MAX_LENGTH}
              placeholder={t('notesPlaceholder')}
              value={notes}
              disabled={!ready}
              aria-invalid={toFix.has("notes") || undefined}
              aria-describedby={toFix.has("notes") ? ids.correction : undefined}
              onChange={(e) => setNotes(e.target.value)}
              // 16 px: iOS zooms into a field with smaller text, and stays zoomed.
              className={cn(FIELD, "min-h-[80px] py-3 text-base", toFix.has("notes") && FIELD_INVALID)}
            />
          </div>
        </>
      )}

      {outbox.otherAccounts > 0 && (
        <p className="flex items-start gap-2 rounded-xl border border-[var(--brand-surface-fg-soft)] p-3 text-sm text-[var(--brand-surface-fg-muted)]">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {t("otherAccountsWaiting", { count: outbox.otherAccounts })}
        </p>
      )}

      {!held && <SaveBar missing={missing} summary={summary} saving={saving} onSave={handleSave} />}
    </div>
  );
}

interface SaveBarProps {
  /** What is still missing, or null when the order can be saved. */
  missing: MissingItem | null;
  /** The order about to be saved, e.g. "Jahez · 4512 · 37.95 SAR". */
  summary: string;
  saving: boolean;
  onSave: () => void;
}

/**
 * Save, fixed within thumb reach. It stays tappable while the order is
 * incomplete: it then says what is missing, and the form brings the worker to it.
 */
function SaveBar({ missing, summary, saving, onSave }: SaveBarProps) {
  const t = useTranslations("brand.submit");
  const canSave = missing === null && !saving;

  return (
    // A solid bar: a blur behind it is redrawn on every scrolled frame, which weak phone GPUs can't keep up with.
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-[var(--brand-surface-fg-soft)] bg-[var(--brand-surface)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        aria-disabled={!canSave}
        className={cn(
          "mx-auto flex min-h-16 w-full max-w-md flex-col items-center justify-center rounded-xl px-4 py-2 transition-transform",
          canSave
            ? "bg-[var(--brand-primary)] text-[var(--brand-primary-fg)] shadow-lg shadow-[color:var(--brand-primary-soft)] active:scale-95"
            : "bg-[var(--brand-surface-fg-soft)] text-[var(--brand-surface-fg)]"
        )}
      >
        {saving ? (
          <span className="flex items-center gap-2 text-lg font-bold">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            {t('processing')}
          </span>
        ) : (
          <>
            <span className={cn("text-lg font-bold", !canSave && "text-[var(--brand-surface-fg-muted)]")}>{t('submitOrder')}</span>
            <span className="line-clamp-1 text-sm font-medium">{missing ? t(missing) : summary}</span>
          </>
        )}
      </button>
    </div>
  );
}
