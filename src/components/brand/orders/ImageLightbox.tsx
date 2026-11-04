"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { RefreshCw, X } from "lucide-react";
import { useTranslations } from "next-intl";

interface ImageLightboxProps {
  src: string | null;
  alt: string;
  onClose: () => void;
  /** Adds a Retake button, for the staff capture screen. */
  onRetake?: () => void;
  /** The phone's Back button closes the photo instead of leaving the page (on Android it would close the installed app). */
  closeOnBack?: boolean;
}

/**
 * Full-screen photo viewer, as a modal dialog: it opens on its Close button
 * and gives the focus back on closing. CSS animation only: the staff capture
 * screen uses it too.
 */
export default function ImageLightbox({ src, alt, onClose, onRetake, closeOnBack = false }: ImageLightboxProps) {
  // Both screens that show it have this section: the staff screen loads only a few, finance loads them all.
  const t = useTranslations("brand.submit");
  const closeButton = useRef<HTMLButtonElement>(null);
  /** The history entry opened for the photo, while it is there. */
  const historyEntry = useRef(false);
  const open = src !== null;

  const close = () => {
    // Closed here rather than with Back: take the photo's history entry off again.
    if (historyEntry.current) {
      historyEntry.current = false;
      history.back();
    }
    onClose();
  };
  const onEscape = useEffectEvent(close);
  const onBack = useEffectEvent(() => {
    historyEntry.current = false;
    onClose();
  });

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open || !closeOnBack) return;
    // Once only, also when React runs this twice in development.
    if (!(history.state as { photoViewer?: boolean } | null)?.photoViewer) history.pushState({ photoViewer: true }, "");
    historyEntry.current = true;
    const onPop = () => onBack();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open, closeOnBack]);

  if (!src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={close}
      className="fixed inset-0 z-[200] bg-black flex items-center justify-center p-4 cursor-zoom-out animate-[fade-in_150ms_ease-out]"
    >
      {/* Solid colours: an opacity modifier needs color-mix(), which older phones' browsers lack. */}
      <button
        ref={closeButton}
        type="button"
        onClick={close}
        aria-label={t("closePhoto")}
        className="absolute top-[max(1rem,env(safe-area-inset-top))] end-4 z-10 rounded-full bg-[#262626] p-3 text-white"
      >
        <X size={24} aria-hidden />
      </button>
      <div
        className="relative flex w-full h-full max-w-5xl max-h-[90vh] items-center justify-center animate-[pop-in_200ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* A plain <img>: the staff screen shows blob: URLs and finance short-lived signed ones, so
            next/image would have nothing to resize. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="max-w-full max-h-full object-contain" />
      </div>
      {onRetake && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            // The camera has to open from this very tap, so the history entry stays: Back then does nothing once.
            historyEntry.current = false;
            onClose();
            onRetake();
          }}
          className="absolute inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-10 mx-auto flex min-h-12 max-w-sm items-center justify-center gap-2 rounded-xl bg-white text-base font-bold text-[#171717]"
        >
          <RefreshCw className="h-5 w-5" aria-hidden />
          {t("retake")}
        </button>
      )}
    </div>
  );
}
