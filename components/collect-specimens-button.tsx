"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { collectSpecimens } from "@/lib/actions/specimens";
import { queueOfflineAction } from "@/lib/offline/queue";
import { Button } from "@/components/ui/button";

export function CollectSpecimensButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const router = useRouter();

  if (queued) {
    return <p className="text-sm text-warning">Queued — will collect automatically when back online.</p>;
  }

  return (
    <div>
      <Button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            if (typeof navigator !== "undefined" && !navigator.onLine) {
              const formData = new FormData();
              formData.set("order_id", orderId);
              await queueOfflineAction("collectSpecimens", `Collect specimens for order`, formData);
              setQueued(true);
              return;
            }
            const result = await collectSpecimens(orderId);
            if (result.error) {
              setError(result.error);
            } else {
              router.refresh();
            }
          })
        }
      >
        {isPending ? "Collecting..." : "Collect Specimens"}
      </Button>
      {error && <p className="mt-2 text-sm text-critical">{error}</p>}
    </div>
  );
}
