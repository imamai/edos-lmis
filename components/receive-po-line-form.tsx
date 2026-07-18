"use client";

import { useActionState } from "react";
import { receivePurchaseOrderLine } from "@/lib/actions/procurement";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

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
        <Label htmlFor={`quantity-${lineId}`}>Quantity received</Label>
        <Input
          id={`quantity-${lineId}`}
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
        <Label htmlFor={`batch_number-${lineId}`}>Batch no. (optional)</Label>
        <Input id={`batch_number-${lineId}`} name="batch_number" className="h-9 w-36" />
      </div>
      <div>
        <Label htmlFor={`expiry_date-${lineId}`}>Expiry date (optional)</Label>
        <Input
          id={`expiry_date-${lineId}`}
          name="expiry_date"
          type="date"
          className="h-9 w-36"
          title="The product's expiry date — leave blank if unknown. Only fill this in if you actually know when it expires; it drives the 'Expiring <6mo' figure on stock reports."
        />
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "Receiving..." : "Receive"}
      </Button>
      {state?.error && <span className="text-xs text-critical">{state.error}</span>}
    </form>
  );
}
