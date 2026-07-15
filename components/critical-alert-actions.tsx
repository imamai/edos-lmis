"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acknowledgeCriticalAlert } from "@/lib/actions/results";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

export function CriticalAlertActions({ alertId, orderTestId }: { alertId: string; orderTestId: string }) {
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Acknowledgement notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
      />
      <Button
        variant="danger"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await acknowledgeCriticalAlert(alertId, orderTestId, notes);
            if (result.error) setError(result.error);
            else router.refresh();
          })
        }
      >
        {isPending ? "Acknowledging..." : "Acknowledge Critical Result"}
      </Button>
      {error && <p className="text-sm text-critical">{error}</p>}
    </div>
  );
}
