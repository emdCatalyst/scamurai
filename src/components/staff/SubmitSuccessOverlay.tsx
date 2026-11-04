"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface SubmitSuccessOverlayProps {
  isVisible: boolean;
  orderNumber?: string;
}

/** A brief "saved" confirmation: the order is on the phone and uploads in the background. */
export default function SubmitSuccessOverlay({ isVisible, orderNumber }: SubmitSuccessOverlayProps) {
  const t = useTranslations("brand.submit");
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--brand-background)]/95 text-[var(--brand-background-fg)] p-6 text-center"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 12 }}
          >
            <CheckCircle2 className="h-24 w-24 text-mint mb-4" />
          </motion.div>

          <h2 className="text-2xl font-bold mb-2">{t("orderSaved")}</h2>

          {orderNumber && (
            <p className="text-[var(--brand-background-fg-muted)] font-mono mb-4">
              {t("reference")}: {orderNumber}
            </p>
          )}

          <p className="text-sm text-[var(--brand-background-fg-muted)]">{t("uploadsInBackground")}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
