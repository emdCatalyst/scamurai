"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface ImageLightboxProps {
  src: string | null;
  alt: string;
  onClose: () => void;
}

/** Full-screen photo viewer. CSS animation only: the staff capture screen uses it too. */
export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out animate-[fade-in_150ms_ease-out]"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 end-4 z-10 text-white/80 hover:text-white p-2 rounded-full bg-white/10 transition-colors"
      >
        <X size={24} />
      </button>
      <div
        className="relative flex w-full h-full max-w-5xl max-h-[90vh] items-center justify-center animate-[pop-in_200ms_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Use a plain <img> rather than next/image — the same component is
            used by the staff capture screen with blob: URLs, which next/image
            rejects even with `unoptimized`. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="max-w-full max-h-full object-contain" />
      </div>
    </div>
  );
}
