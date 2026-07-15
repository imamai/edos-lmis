"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelOrder } from "@/lib/actions/orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  const [show, setShow] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (show) {
    return (
      <div className="flex items-center gap-2">
        <Input
          placeholder="Cancellation reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="h-9 w-52"
        />
        <Button
          variant="danger"
          disabled={isPending || !reason.trim()}
          onClick={() =>
            startTransition(async () => {
              const result = await cancelOrder(orderId, reason);
              if (result.error) setError(result.error);
              else router.refresh();
            })
          }
        >
          Confirm Cancel
        </Button>
        <Button variant="ghost" onClick={() => setShow(false)}>
          Back
        </Button>
        {error && <span className="text-xs text-critical">{error}</span>}
      </div>
    );
  }

  return (
    <Button variant="outline" onClick={() => setShow(true)}>
      Cancel Order
    </Button>
  );
}
