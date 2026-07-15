"use client";

import { useActionState, useState, useTransition } from "react";
import { recordRfqResponse, convertRfqToPurchaseOrder } from "@/lib/actions/procurement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RfqResponseForm({
  rfqId,
  rfqSupplierId,
  quotedTotal,
  respondedAt,
}: {
  rfqId: string;
  rfqSupplierId: string;
  quotedTotal: number | null;
  respondedAt: string | null;
}) {
  const [state, formAction, pending] = useActionState(recordRfqResponse, null);
  const [isConverting, startConvert] = useTransition();
  const [convertError, setConvertError] = useState<string | null>(null);

  if (respondedAt) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">{quotedTotal}</span>
        <Button
          size="sm"
          variant="secondary"
          disabled={isConverting}
          onClick={() =>
            startConvert(async () => {
              const result = await convertRfqToPurchaseOrder(rfqSupplierId);
              if (result?.error) setConvertError(result.error);
            })
          }
        >
          {isConverting ? "Converting..." : "Convert to PO"}
        </Button>
        {convertError && <span className="text-xs text-critical">{convertError}</span>}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="rfq_id" value={rfqId} />
      <input type="hidden" name="rfq_supplier_id" value={rfqSupplierId} />
      <Input name="quoted_total" type="number" step="0.01" min="0" placeholder="Quoted total" className="h-9 w-32" />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "Saving..." : "Record Quote"}
      </Button>
      {state?.error && <span className="text-xs text-critical">{state.error}</span>}
    </form>
  );
}
