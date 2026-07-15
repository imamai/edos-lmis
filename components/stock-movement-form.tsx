"use client";

import { useActionState } from "react";
import { recordStockMovement } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

export function StockMovementForm({ itemId }: { itemId: string }) {
  const [state, formAction, pending] = useActionState(recordStockMovement, null);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
      <input type="hidden" name="item_id" value={itemId} />
      <div>
        <Label htmlFor="transaction_type">Movement</Label>
        <Select id="transaction_type" name="transaction_type" defaultValue="receipt">
          <option value="receipt">Receipt (stock in)</option>
          <option value="positive_adjustment">Positive adjustment</option>
          <option value="negative_adjustment">Negative adjustment</option>
          <option value="wastage">Wastage</option>
          <option value="expiry">Expiry</option>
          <option value="stock_count_correction">Stock count correction</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="quantity">Quantity</Label>
        <Input id="quantity" name="quantity" type="number" step="0.01" required />
        <p className="mt-1 text-xs text-muted-foreground">
          For Stock count correction, use a negative number if the physical count came in under the system balance.
        </p>
      </div>
      <div className="sm:col-span-1">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" />
      </div>
      <div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Saving..." : "Record Movement"}
        </Button>
      </div>
      {state?.error && (
        <p className="sm:col-span-4 text-sm text-critical">{state.error}</p>
      )}
    </form>
  );
}
