"use client";

import { useState, useTransition } from "react";
import { generateInvoice } from "@/lib/actions/billing";
import { Button } from "@/components/ui/button";

export function GenerateInvoiceButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isVatExempt, setIsVatExempt] = useState(false);

  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={isVatExempt}
          onChange={(e) => setIsVatExempt(e.target.checked)}
          className="h-4 w-4"
        />
        VAT exempt
      </label>
      <Button
        variant="secondary"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await generateInvoice(orderId, isVatExempt);
            if (result?.error) setError(result.error);
          })
        }
      >
        {isPending ? "Generating..." : "Generate Invoice"}
      </Button>
      {error && <p className="mt-2 text-sm text-critical">{error}</p>}
    </div>
  );
}
