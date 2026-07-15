"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deactivatePatient } from "@/lib/actions/patients";
import { Button } from "@/components/ui/button";

export function DeactivatePatientRowButton({ patientId }: { patientId: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span>Deactivate?</span>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await deactivatePatient(patientId);
              if (result?.error) {
                setError(result.error);
                setConfirming(false);
              } else {
                router.refresh();
              }
            })
          }
          className="font-medium text-critical hover:underline"
        >
          {isPending ? "..." : "Confirm"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="text-muted-foreground hover:underline">
          Cancel
        </button>
        {error && <span className="text-critical">{error}</span>}
      </div>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
      Deactivate
    </Button>
  );
}
