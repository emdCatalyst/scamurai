"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";

type InstallPromptEvent = Event & { prompt: () => Promise<void> };

/**
 * "Install app", shown only when the browser offers it (Android Chrome).
 * Installed, the brand's app opens straight on the order screen.
 */
export default function InstallAppButton({ className }: { className?: string }) {
  const t = useTranslations("brand.submit");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!installPrompt) return null;

  return (
    <button
      type="button"
      title={t("installApp")}
      aria-label={t("installApp")}
      className={className}
      onClick={async () => {
        await installPrompt.prompt();
        setInstallPrompt(null);
      }}
    >
      <Download className="h-5 w-5" />
    </button>
  );
}
