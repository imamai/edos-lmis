"use client";

import { useActionState } from "react";
import { receivePurchaseOrderLine } from "@/lib/actions/procurement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ReceivePoLineForm({
  poId,
  lineId,
  unitOfMeasure,
  outstanding,
}: {
  poId: string;
  lineId: string;
  unitOfMeasure: string;
  outstanding: number;
}) {
  const [state, formAction, pending] = useActionState(receivePurchaseOrderLine, null);

  if (outstanding <= 0) {
    return <span className="text-xs text-muted-foreground">Fully received</span>;
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="po_id" value={poId} />
      <input type="hidden" name="line_id" value={lineId} />
      <div>
        <Input
          name="quantity"
          type="number"
          step="0.01"
          min="0"
          max={outstanding}
          placeholder={`up to ${outstanding} ${unitOfMeasure}`}
          className="h-9 w-36"
          required
        />
      </div>
      <div>
        <Input name="batch_number" placeholder="Batch no. (optional)" className="h-9 w-36" />
      </div>
      <div>
        <Input name="expiry_date" type="date" className="h-9 w-36" title="Expiry date (optional)" />
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "Receiving..." : "Receive"}
      </Button>
      {state?.error && <span className="text-xs text-critical">{state.error}</span>}
    </form>
  );
}
