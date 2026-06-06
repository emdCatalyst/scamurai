"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarClock, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import {
  ACCESS_DURATIONS,
  type AccessDuration,
  durationToExpiry,
} from "@/lib/accessDuration";
import { setBrandAccessExpiry } from "@/actions/setBrandAccessExpiry";
import { useToast } from "@/components/ui/Toast";
import type { BrandRow } from "@/lib/queries/brands";
import { useRouter } from "next/navigation";

interface BrandAccessExpiryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  brand: BrandRow;
}

export default function BrandAccessExpiryDialog({
  isOpen,
  onClose,
  brand,
}: BrandAccessExpiryDialogProps) {
  const t = useTranslations("admin.brands.access");
  const tDur = useTranslations("admin.brands.access.durations");
  const tCommon = useTranslations("common.dialog");
  const format = useFormatter();
  const router = useRouter();
  const { toast } = useToast();

  const [duration, setDuration] = useState<AccessDuration>("3mo");
  const [mode, setMode] = useState<"extend" | "set">("extend");
  const [isSaving, setIsSaving] = useState(false);

  // Reset defaults whenever the dialog transitions closed→open or onto a
  // different brand — using the "store previous value during render"
  // pattern so we don't trip react-hooks/set-state-in-effect.
  const [prevKey, setPrevKey] = useState<string>(`${brand.id}:${isOpen}`);
  const currentKey = `${brand.id}:${isOpen}`;
  if (prevKey !== currentKey) {
    setPrevKey(currentKey);
    if (isOpen) {
      setDuration("3mo");
      setMode("extend");
    }
  }

  // Body-scroll lock is a real external-system side effect, so it belongs
  // in an effect.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const now = useMemo(() => new Date(), [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  const currentExpiry = brand.accessExpiresAt
    ? new Date(brand.accessExpiresAt)
    : null;
  const isExpired = currentExpiry !== null && currentExpiry <= now;

  // Preview the new expiry so the master admin sees exactly what they're
  // about to commit before clicking save.
  const baseDate =
    mode === "extend" && currentExpiry && currentExpiry > now
      ? currentExpiry
      : now;
  const previewExpiry = durationToExpiry(duration, baseDate);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await setBrandAccessExpiry({
      brandId: brand.id,
      duration,
      mode,
    });
    setIsSaving(false);

    if (result.success) {
      toast(t("saved"), "success");
      router.refresh();
      onClose();
    } else {
      toast(result.error || t("error"), "error");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSaving && onClose()}
            className={`absolute inset-0 bg-[#0A1628]/40 backdrop-blur-sm ${
              !isSaving ? "cursor-pointer" : "cursor-wait"
            }`}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
          >
            {/* Header */}
            <div className="px-8 pt-8 pb-4 flex items-start gap-5">
              <div className="w-14 h-14 rounded-2xl bg-sky/10 text-sky flex items-center justify-center shrink-0">
                <CalendarClock size={28} />
              </div>
              <div className="flex-1 pt-1 min-w-0">
                <h3 className="text-xl font-bold text-slate-800 leading-tight truncate">
                  {t("title")}
                </h3>
                <p className="text-slate-500 text-sm mt-1 truncate">
                  {brand.name}
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={isSaving}
                className="p-1 -mt-1 -me-1 text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-30"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="px-8 pb-6 space-y-6">
              {/* Current state */}
              <div className="rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {t("current")}
                </div>
                <div className="mt-1 text-sm">
                  {currentExpiry ? (
                    <span
                      className={
                        isExpired
                          ? "text-red-500 font-bold"
                          : "text-slate-800 font-semibold"
                      }
                    >
                      {format.dateTime(currentExpiry, { dateStyle: "medium" })}
                      {isExpired && ` — ${t("alreadyExpired")}`}
                    </span>
                  ) : (
                    <span className="text-slate-800 font-semibold">
                      {t("noExpiry")}
                    </span>
                  )}
                </div>
              </div>

              {/* Duration picker */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  {t("addDuration")}
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {ACCESS_DURATIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      disabled={isSaving}
                      className={`px-2 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        duration === d
                          ? "border-sky bg-sky/10 text-sky"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      } disabled:opacity-50`}
                    >
                      {tDur(d)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode toggle — only meaningful when extending a future expiry */}
              {currentExpiry && currentExpiry > now && duration !== "none" && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    {t("modeLabel")}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMode("extend")}
                      disabled={isSaving}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border text-left ${
                        mode === "extend"
                          ? "border-sky bg-sky/10 text-sky"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      } disabled:opacity-50`}
                    >
                      <div>{t("modeExtend")}</div>
                      <div className="font-normal text-[10px] text-slate-500 mt-0.5">
                        {t("modeExtendHint")}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("set")}
                      disabled={isSaving}
                      className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border text-left ${
                        mode === "set"
                          ? "border-sky bg-sky/10 text-sky"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      } disabled:opacity-50`}
                    >
                      <div>{t("modeSet")}</div>
                      <div className="font-normal text-[10px] text-slate-500 mt-0.5">
                        {t("modeSetHint")}
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Preview */}
              <div className="rounded-2xl bg-sky/5 border border-sky/20 px-4 py-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-sky">
                  {t("newExpiry")}
                </div>
                <div className="mt-1 text-sm font-bold text-slate-800">
                  {previewExpiry
                    ? format.dateTime(previewExpiry, { dateStyle: "long" })
                    : t("noExpiry")}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 py-5 flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={onClose}
                disabled={isSaving}
                className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-50 rounded-xl"
              >
                {tCommon("cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-8 py-2.5 rounded-xl text-sm font-bold bg-navy text-white shadow-lg transition-all disabled:opacity-50"
              >
                {isSaving ? tCommon("loading") : t("save")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
