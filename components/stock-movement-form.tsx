"use client";

import { useActionState } from "react";
import { recordStockMovement } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function StockMovementForm({ itemId, trackingMode }: { itemId: string; trackingMode: string }) {
  const [state, formAction, pending] = useActionState(recordStockMovement, null);
  const isManualEntry = trackingMode === "manual_entry";

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-5 sm:items-end">
      <input type="hidden" name="item_id" value={itemId} />
      <div>
        <Label htmlFor="transaction_type">Movement</Label>
        <Select id="transaction_type" name="transaction_type" defaultValue={isManualEntry ? "manual_usage" : "receipt"}>
          <option value="receipt">Receipt (stock in)</option>
          {isManualEntry && <option value="manual_usage">Manual usage (tests done)</option>}
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
      <div>
        <Label htmlFor="performed_at">Date</Label>
        <Input id="performed_at" name="performed_at" type="date" defaultValue={todayStr()} max={todayStr()} required />
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
        <p className="sm:col-span-5 text-sm text-critical">{state.error}</p>
      )}
    </form>
  );
}
