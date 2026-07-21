"use client";

import { useActionState, useEffect, useState } from "react";
import { correctPurchaseOrderDate } from "@/lib/actions/procurement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";

export function CorrectPoOrderDateForm({ poId, orderDate }: { poId: string; orderDate: string }) {
  const [state, formAction, pending] = useActionState(correctPurchaseOrderDate, null);
  // Same locked-with-a-toggle pattern as the invoice number field — the
  // order date is what's printed on the PO and used for record-keeping, so
  // it shouldn't be an always-open input that's easy to nudge by accident.
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (state && !state.error) setEditing(false);
  }, [state]);

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Order Date</span>
        <span className="font-medium text-foreground">{orderDate}</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
          <Pencil size={14} /> Correct
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="po_id" value={poId} />
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Order Date</label>
        <Input name="order_date" type="date" defaultValue={orderDate} className="h-9 w-40" required autoFocus />
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
        Cancel
      </Button>
      {state?.error && <span className="text-xs text-critical">{state.error}</span>}
    </form>
  );
}
