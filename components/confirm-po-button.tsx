"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmPurchaseOrder } from "@/lib/actions/procurement";
import { Button } from "@/components/ui/button";

export function ConfirmPoButton({ poId }: { poId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div>
      <Button
        variant="secondary"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await confirmPurchaseOrder(poId);
            if (result.error) setError(result.error);
            else router.refresh();
          })
        }
      >
        {isPending ? "Confirming..." : "Mark Confirmed by Supplier"}
      </Button>
      {error && <p className="mt-2 text-sm text-critical">{error}</p>}
    </div>
  );
}
