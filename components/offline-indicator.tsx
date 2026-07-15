"use client";

import { useCallback, useEffect, useState } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { getQueueCount, flushOfflineQueue, QUEUE_CHANGED_EVENT } from "@/lib/offline/queue";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(() => {
    getQueueCount().then(setQueueCount).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof navigator !== "undefined") setIsOnline(navigator.onLine);
    refreshCount();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    async function handleOnline() {
      setIsOnline(true);
      setSyncing(true);
      await flushOfflineQueue();
      setSyncing(false);
      refreshCount();
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(QUEUE_CHANGED_EVENT, refreshCount);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(QUEUE_CHANGED_EVENT, refreshCount);
    };
  }, [refreshCount]);

  if (isOnline && queueCount === 0 && !syncing) return null;

  return (
    <div className="flex items-center gap-2 bg-warning/15 px-4 py-2 text-sm text-warning">
      {syncing ? (
        <>
          <RefreshCw size={14} className="animate-spin" />
          <span>Syncing {queueCount > 0 ? `${queueCount} queued action(s)` : ""}...</span>
        </>
      ) : !isOnline ? (
        <>
          <WifiOff size={14} />
          <span>Offline{queueCount > 0 ? ` — ${queueCount} action(s) queued, will sync automatically` : ""}</span>
        </>
      ) : (
        <span>{queueCount} action(s) queued for sync</span>
      )}
    </div>
  );
}
