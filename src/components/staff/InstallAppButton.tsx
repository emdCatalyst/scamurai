"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";

type InstallPromptEvent = Event & { prompt: () => Promise<void> };

/** Safari on an iPhone, not yet installed: it never offers an install prompt, only "Add to Home Screen" under Share. */
const isIosSafariTab = () => (navigator as Navigator & { standalone?: boolean }).standalone === false;
const unchanging = () => () => {};

/**
 * "Install app": on Android Chrome once the browser offers it, and in Safari
 * on an iPhone as the steps to follow. Installed, the brand's app opens
 * straight on the order screen.
 */
export default function InstallAppButton({ className }: { className?: string }) {
  const t = useTranslations("brand.submit");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const iosSafariTab = useSyncExternalStore(unchanging, isIosSafariTab, () => false);

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

  if (!installPrompt && !iosSafariTab) return null;

  return (
    <button
      type="button"
      title={t("installApp")}
      aria-label={t("installApp")}
      className={className}
      onClick={async () => {
        if (!installPrompt) {
          window.alert(t("installIos"));
          return;
        }
        await installPrompt.prompt();
        setInstallPrompt(null);
      }}
    >
      <Download className="h-5 w-5" />
    </button>
  );
}
