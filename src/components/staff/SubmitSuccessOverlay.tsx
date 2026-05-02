"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface SubmitSuccessOverlayProps {
  isVisible: boolean;
  orderNumber?: string;
  isUploading: boolean;
}

export default function SubmitSuccessOverlay({
  isVisible,
  orderNumber,
  isUploading,
}: SubmitSuccessOverlayProps) {
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

          <motion.h2
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-2xl font-bold mb-2"
          >
            {t('orderSubmitted')}
          </motion.h2>

          {orderNumber && (
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-[var(--brand-background-fg-muted)] font-mono mb-8"
            >
              {t('reference')}: {orderNumber}
            </motion.p>
          )}

          {isUploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 text-[var(--brand-primary)]/80 text-sm"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('uploadingImages')}</span>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
