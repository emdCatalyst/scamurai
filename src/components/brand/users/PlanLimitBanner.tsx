"use client";

import { useTranslations } from "next-intl";
import { AlertCircle } from "lucide-react";

export default function PlanLimitBanner({ limit }: { limit: number }) {
  const t = useTranslations("brand.users.limit");

  return (
    <div className="flex items-center gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
        <AlertCircle size={20} />
      </div>
      <div>
        <h4 className="text-sm font-bold text-amber-900">
          {t("title")}
        </h4>
        <p className="text-xs text-amber-700/80 mt-0.5">
          {t("description", { limit })}
        </p>
      </div>
    </div>
  );
}
