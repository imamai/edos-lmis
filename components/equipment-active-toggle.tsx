"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setEquipmentActive } from "@/lib/actions/equipment";
import { Button } from "@/components/ui/button";

export function EquipmentActiveToggle({ equipmentId, isActive }: { equipmentId: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div>
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await setEquipmentActive(equipmentId, !isActive);
            if (result.error) setError(result.error);
            else router.refresh();
          })
        }
      >
        {isPending ? "Saving..." : isActive ? "Deactivate" : "Reactivate"}
      </Button>
      {error && <p className="mt-2 text-sm text-critical">{error}</p>}
    </div>
  );
}
