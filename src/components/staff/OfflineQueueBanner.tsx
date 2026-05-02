"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { imageQueue } from "@/lib/imageQueue";
import { uploadOrder } from "@/lib/presignedUpload";
import { useTranslations } from "next-intl";

export default function OfflineQueueBanner() {
  const t = useTranslations("brand.submit");
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ success: boolean; message: string } | null>(null);

  const checkQueue = useCallback(async () => {
    const pending = await imageQueue.getPending();
    setPendingCount(pending.length);
  }, []);

  useEffect(() => {
    // Initial check
    const init = async () => {
      await checkQueue();
    };
    init();
    
    // Check every 30 seconds
    const interval = setInterval(checkQueue, 30000);
    return () => clearInterval(interval);
  }, [checkQueue]);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setLastSyncResult(null);

    try {
      const pending = await imageQueue.getPending();
      let successCount = 0;
      let failCount = 0;

      for (const order of pending) {
        const result = await uploadOrder(order);
        if (result.success) {
          await imageQueue.remove(order.id);
          successCount++;
        } else {
          failCount++;
          // Update attempts
          const updatedOrder = {
            ...order,
            attempts: order.attempts + 1,
            lastError: result.error
          };
          await imageQueue.update(updatedOrder);
        }
      }

      if (successCount > 0) {
        setLastSyncResult({ 
          success: true, 
          message: t('syncSuccess', { count: successCount })
        });
      } else if (failCount > 0) {
        setLastSyncResult({ 
          success: false, 
          message: t('syncError', { count: failCount })
        });
      }

      await checkQueue();
    } catch (err) {
      console.error('[OfflineQueueBanner] Sync error:', err);
    } finally {
      setIsSyncing(false);
      // Clear message after 5 seconds
      setTimeout(() => setLastSyncResult(null), 5000);
    }
  };

  if (pendingCount === 0 && !lastSyncResult) return null;

  return (
    <div className="fixed top-16 left-4 right-4 z-40">
      {pendingCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 p-4 shadow-lg border border-amber-100 mb-2">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-amber-900">
                {t('pendingUploads', { count: pendingCount })}
              </span>
              <span className="text-xs text-amber-700">{t('offlineWarning')}</span>
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            {isSyncing ? t('syncing') : t('syncNow')}
          </button>
        </div>
      )}

      {lastSyncResult && (
        <div className={cn(
          "flex items-center gap-3 rounded-xl p-4 shadow-lg border animate-in fade-in slide-in-from-top-4",
          lastSyncResult.success ? "bg-[var(--brand-mint)]/10 border-mint text-mint-900" : "bg-[var(--brand-danger)]/10 border-[var(--brand-danger)]/20 text-[var(--brand-danger)]"
        )}>
          {lastSyncResult.success ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span className="text-sm font-medium">{lastSyncResult.message}</span>
        </div>
      )}
    </div>
  );
}

// Helper to use cn in this file if needed
function cn(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(" ");
}
