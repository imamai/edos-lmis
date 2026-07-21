"use client";

import { useActionState, useState } from "react";
import { correctPurchaseOrderLineReceipt } from "@/lib/actions/procurement";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function CorrectPoLineReceiptForm({
  poId,
  lineId,
  unitOfMeasure,
  quantityReceived,
  unitCost,
}: {
  poId: string;
  lineId: string;
  unitOfMeasure: string;
  quantityReceived: number;
  unitCost: number | null;
}) {
  const [state, formAction, pending] = useActionState(correctPurchaseOrderLineReceipt, null);
  const [show, setShow] = useState(false);

  if (!show) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setShow(true)}>
        Correct
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="po_id" value={poId} />
      <input type="hidden" name="line_id" value={lineId} />
      <div>
        <Label htmlFor={`correct-quantity-${lineId}`}>Corrected received qty</Label>
        <Input
          id={`correct-quantity-${lineId}`}
          name="quantity_received"
          type="number"
          step="0.01"
          min="0"
          defaultValue={quantityReceived}
          placeholder={unitOfMeasure}
          className="h-9 w-32"
          required
        />
      </div>
      <div>
        <Label htmlFor={`correct-unit-cost-${lineId}`}>Corrected unit cost</Label>
        <Input
          id={`correct-unit-cost-${lineId}`}
          name="unit_cost"
          type="number"
          step="0.01"
          min="0"
          defaultValue={unitCost ?? ""}
          placeholder="KES"
          className="h-9 w-28"
        />
      </div>
      <div>
        <Label htmlFor={`correct-reason-${lineId}`}>Reason</Label>
        <Input
          id={`correct-reason-${lineId}`}
          name="reason"
          placeholder="e.g. miscounted on receipt"
          className="h-9 w-52"
          required
        />
      </div>
      <Button type="submit" size="sm" variant="danger" disabled={pending}>
        {pending ? "Saving..." : "Save Correction"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setShow(false)}>
        Cancel
      </Button>
      {state?.error && <span className="text-xs text-critical">{state.error}</span>}
    </form>
  );
}
