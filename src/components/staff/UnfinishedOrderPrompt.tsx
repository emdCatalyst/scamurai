"use client";

import { useEffect, useId, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface UnfinishedOrderPromptProps {
  /** When the worker last changed it, e.g. "3 hours ago"; unknown for drafts older than that record. */
  when?: string;
  orderNumber: string;
  /** Preview URLs of its photos. */
  photos: string[];
  onContinue: () => void;
  onDiscard: () => void;
}

/**
 * An order left unfinished for so long that its photos may be of a bag that
 * has gone: shown instead of the form until the worker says whether it is
 * the order in front of them.
 */
export default function UnfinishedOrderPrompt({ when, orderNumber, photos, onContinue, onDiscard }: UnfinishedOrderPromptProps) {
  const t = useTranslations("brand.submit");
  const heading = useRef<HTMLHeadingElement>(null);
  const headingId = useId();

  // It takes the form's place: screen readers start on the question.
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <section
      aria-labelledby={headingId}
      // Hex, not Tailwind's oklch() palette, which Chrome before 111 and Safari before 15.4 can't read.
      className="flex flex-col gap-4 rounded-xl border-2 border-[#fde68a] bg-[#fffbeb] p-4 text-[#78350f]"
    >
      <h2 ref={heading} id={headingId} tabIndex={-1} className="flex items-start gap-2 text-base font-bold outline-none">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <span>
          {t("draftFound")} {when && t("draftChanged", { when })}
        </span>
      </h2>
      {(photos.length > 0 || orderNumber) && (
        <div className="flex items-center gap-3">
          {photos.map((url) => (
            <Image key={url} src={url} alt="" width={80} height={80} className="h-20 w-20 rounded-lg object-cover" />
          ))}
          {orderNumber && <bdi className="font-mono text-lg font-bold">{orderNumber}</bdi>}
        </div>
      )}
      <p className="text-sm">{t("draftCheck")}</p>
      <button
        type="button"
        onClick={onContinue}
        className="min-h-12 rounded-xl bg-[var(--brand-primary)] px-4 text-base font-bold text-[var(--brand-primary-fg)]"
      >
        {t("draftContinue")}
      </button>
      <button type="button" onClick={onDiscard} className="min-h-12 rounded-xl border-2 border-[#78350f] px-4 text-base font-bold">
        {t("draftDiscard")}
      </button>
    </section>
  );
}
