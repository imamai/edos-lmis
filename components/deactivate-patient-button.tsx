"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deactivatePatient } from "@/lib/actions/patients";
import { Button } from "@/components/ui/button";

export function DeactivatePatientButton({ patientId }: { patientId: string }) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Deactivate this patient record?</span>
        <Button
          variant="danger"
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await deactivatePatient(patientId);
              if (result?.error) setError(result.error);
              else router.push("/patients");
            })
          }
        >
          Confirm
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
        {error && <span className="text-xs text-critical">{error}</span>}
      </div>
    );
  }

  return (
    <Button variant="outline" onClick={() => setConfirming(true)}>
      Deactivate
    </Button>
  );
}
