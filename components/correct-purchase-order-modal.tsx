"use client";

import { useActionState, useEffect, useState } from "react";
import { correctPurchaseOrder } from "@/lib/actions/procurement";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Pencil } from "lucide-react";

type CorrectableLine = {
  id: string;
  quantityReceived: number;
  unitCost: number | null;
  itemName: string;
  unitOfMeasure: string;
};

export function CorrectPurchaseOrderModal({
  poId,
  orderDate,
  supplierInvoiceNumber,
  lines,
  billLinked,
}: {
  poId: string;
  orderDate: string;
  supplierInvoiceNumber: string | null;
  lines: CorrectableLine[];
  billLinked: boolean;
}) {
  const [state, formAction, pending] = useActionState(correctPurchaseOrder, null);
  const [open, setOpen] = useState(false);

  // Closing (not "locking" a displayed value) is safe to do optimistically
  // on success — unlike the invoice-number field's own bug, there's no
  // stale value shown once the dialog is gone; the page catches up to the
  // fresh data on its own moments later via revalidatePath.
  useEffect(() => {
    if (state && !state.error) setOpen(false);
  }, [state]);

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Pencil size={16} /> Correct
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Correct Purchase Order">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="po_id" value={poId} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="order_date">Order date</Label>
              <Input id="order_date" name="order_date" type="date" defaultValue={orderDate} required />
            </div>
            <div>
              <Label htmlFor="supplier_invoice_number">Supplier invoice number</Label>
              <Input
                id="supplier_invoice_number"
                name="supplier_invoice_number"
                defaultValue={supplierInvoiceNumber ?? ""}
                placeholder="e.g. INV-4821"
              />
            </div>
          </div>

          {lines.length > 0 && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground">Received quantities &amp; unit costs</p>
              {lines.map((line) => (
                <div key={line.id} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="line_id" value={line.id} />
                  <p className="min-w-[9rem] flex-1 text-sm text-foreground">{line.itemName}</p>
                  <div>
                    <Label htmlFor={`quantity__${line.id}`} className="text-xs">Received qty</Label>
                    <Input
                      id={`quantity__${line.id}`}
                      name={`quantity__${line.id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={line.quantityReceived}
                      placeholder={line.unitOfMeasure}
                      className="h-9 w-24"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`unit_cost__${line.id}`} className="text-xs">Unit cost</Label>
                    <Input
                      id={`unit_cost__${line.id}`}
                      name={`unit_cost__${line.id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      defaultValue={line.unitCost ?? ""}
                      placeholder="KES"
                      className="h-9 w-24"
                    />
                  </div>
                </div>
              ))}
              <div>
                <Label htmlFor="reason" className="text-xs">Reason for quantity/cost changes</Label>
                <Input id="reason" name="reason" placeholder="e.g. miscounted on receipt" />
              </div>
              {billLinked && (
                <p className="text-xs text-muted-foreground">
                  A supplier bill already exists for this PO — changing a quantity or unit cost here also updates
                  its totals.
                </p>
              )}
            </div>
          )}

          {state?.error && (
            <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{state.error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Corrections"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
