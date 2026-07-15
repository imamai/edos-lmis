"use client";

import { useState, useTransition } from "react";
import { generateSupplierBill } from "@/lib/actions/supplier-bills";
import { Button } from "@/components/ui/button";

export function GenerateSupplierBillButton({ poId }: { poId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <Button
        variant="secondary"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await generateSupplierBill(poId);
            if (result?.error) setError(result.error);
          })
        }
      >
        {isPending ? "Generating..." : "Generate Supplier Bill"}
      </Button>
      {error && <p className="mt-2 text-sm text-critical">{error}</p>}
    </div>
  );
}
