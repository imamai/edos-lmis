"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateStockBatch, setStockBatchActive } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export type BatchRow = {
  id: string;
  batchNumber: string;
  supplierName: string | null;
  expiryDate: string | null;
  quantityReceived: number;
  quantityRemaining: number;
  unitCost: number | null;
  isActive: boolean;
  receivedAt: string;
};

function isExpiringSoon(expiryDate: string | null) {
  if (!expiryDate) return false;
  const sixMonthsOut = new Date();
  sixMonthsOut.setMonth(sixMonthsOut.getMonth() + 6);
  return new Date(`${expiryDate}T00:00:00`) <= sixMonthsOut;
}

export function EditableBatchRow({ batch, itemId, unitOfMeasure }: { batch: BatchRow; itemId: string; unitOfMeasure: string }) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [state, formAction, pending] = useActionState(updateStockBatch, null);
  const [isTogglingActive, startToggle] = useTransition();
  const router = useRouter();

  if (mode === "edit") {
    return (
      <tr className="border-t border-border bg-surface-muted">
        <td colSpan={7} className="px-4 py-3">
          <form action={formAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="batch_id" value={batch.id} />
            <input type="hidden" name="item_id" value={itemId} />
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Batch no.</label>
              <Input name="batch_number" defaultValue={batch.batchNumber} className="h-9 w-32" required />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Supplier</label>
              <Input name="supplier_name" defaultValue={batch.supplierName ?? ""} className="h-9 w-36" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Expiry date</label>
              <Input name="expiry_date" type="date" defaultValue={batch.expiryDate ?? ""} className="h-9 w-36" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Unit cost</label>
              <Input name="unit_cost" type="number" step="0.01" min="0" defaultValue={batch.unitCost ?? ""} className="h-9 w-24" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Qty remaining</label>
              <Input
                name="quantity_remaining"
                type="number"
                step="0.01"
                min="0"
                defaultValue={batch.quantityRemaining}
                className="h-9 w-24"
                required
              />
            </div>
            <Button type="submit" disabled={pending} className="h-9">
              {pending ? "Saving..." : "Save"}
            </Button>
            <Button type="button" variant="ghost" className="h-9" onClick={() => setMode("view")}>
              Cancel
            </Button>
            {state?.error && <span className="w-full text-xs text-critical">{state.error}</span>}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`border-t border-border ${batch.isActive ? "" : "opacity-50"}`}>
      <td className="px-4 py-2 font-medium text-foreground">{batch.batchNumber}</td>
      <td className="px-4 py-2 text-muted-foreground">{batch.supplierName ?? "-"}</td>
      <td className="px-4 py-2">
        {batch.expiryDate ?? "-"}
        {batch.isActive && isExpiringSoon(batch.expiryDate) && (
          <Badge tone="warning" className="ml-2">
            Expiring
          </Badge>
        )}
      </td>
      <td className="px-4 py-2 text-muted-foreground">
        {batch.quantityRemaining} / {batch.quantityReceived} {unitOfMeasure}
      </td>
      <td className="px-4 py-2 text-muted-foreground">{batch.unitCost ?? "-"}</td>
      <td className="px-4 py-2">
        <Badge tone={batch.isActive ? "success" : "neutral"}>{batch.isActive ? "Active" : "Inactive"}</Badge>
      </td>
      <td className="px-4 py-2 text-right">
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setMode("edit")}>
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isTogglingActive}
            onClick={() =>
              startToggle(async () => {
                await setStockBatchActive(batch.id, itemId, !batch.isActive);
                router.refresh();
              })
            }
          >
            {batch.isActive ? "Deactivate" : "Reactivate"}
          </Button>
        </div>
      </td>
    </tr>
  );
}
