"use client";

import { useActionState } from "react";
import { updateSupplierBill } from "@/lib/actions/supplier-bills";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";

export function EditSupplierBillForm({
  billId,
  billDate,
  dueDate,
  notes,
}: {
  billId: string;
  billDate: string;
  dueDate: string | null;
  notes: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateSupplierBill, null);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <input type="hidden" name="bill_id" value={billId} />
      <div>
        <Label htmlFor="bill_date">Bill date *</Label>
        <Input id="bill_date" name="bill_date" type="date" required defaultValue={billDate} />
      </div>
      <div>
        <Label htmlFor="due_date">Due date</Label>
        <Input id="due_date" name="due_date" type="date" defaultValue={dueDate ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={notes ?? ""} />
      </div>
      <div className="sm:col-span-2 flex items-center justify-end gap-2">
        {state?.error && <span className="text-xs text-critical">{state.error}</span>}
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
