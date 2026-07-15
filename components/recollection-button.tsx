"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestRecollection } from "@/lib/actions/specimens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RecollectionButton({ orderTestId }: { orderTestId: string }) {
  const [isPending, startTransition] = useTransition();
  const [show, setShow] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (show) {
    return (
      <div className="flex items-center gap-2">
        <Input
          placeholder="Reason for recollection"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="h-8 w-48"
        />
        <Button
          size="sm"
          disabled={isPending || !reason.trim()}
          onClick={() =>
            startTransition(async () => {
              const result = await requestRecollection(orderTestId, reason);
              if (result.error) setError(result.error);
              else router.refresh();
            })
          }
        >
          Confirm
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setShow(false)}>
          Cancel
        </Button>
        {error && <span className="text-xs text-critical">{error}</span>}
      </div>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={() => setShow(true)}>
      Request Recollection
    </Button>
  );
}
