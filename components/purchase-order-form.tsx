"use client";

import { useActionState } from "react";
import { createPurchaseOrder, updatePurchaseOrder } from "@/lib/actions/procurement";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SupplierRow = { id: string; name: string };
type ItemRow = { id: string; code: string; name: string; unit_of_measure: string; reorder_level: number; current_balance: number };
type ExistingPo = {
  id: string;
  supplier_id: string;
  expected_date: string | null;
  notes: string | null;
  lines: { item_id: string; quantity_ordered: number; unit_cost: number | null }[];
};

export function PurchaseOrderForm({
  suppliers,
  items,
  defaultSupplierId,
  existingPo,
}: {
  suppliers: SupplierRow[];
  items: ItemRow[];
  defaultSupplierId?: string;
  existingPo?: ExistingPo;
}) {
  const [state, formAction, pending] = useActionState(
    existingPo ? updatePurchaseOrder : createPurchaseOrder,
    null
  );
  const lineByItem = new Map((existingPo?.lines ?? []).map((l) => [l.item_id, l]));

  return (
    <form action={formAction} className="space-y-4">
      {existingPo && <input type="hidden" name="po_id" value={existingPo.id} />}
      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="supplier_id">Supplier *</Label>
            <Select id="supplier_id" name="supplier_id" required defaultValue={existingPo?.supplier_id ?? defaultSupplierId ?? ""}>
              <option value="" disabled>Select a supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="expected_date">Expected delivery date</Label>
            <Input id="expected_date" name="expected_date" type="date" defaultValue={existingPo?.expected_date ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={existingPo?.notes ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commodities to order</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Commodity</th>
                <th className="px-4 py-2 font-medium">Current balance</th>
                <th className="px-4 py-2 font-medium">Quantity to order</th>
                <th className="px-4 py-2 font-medium">Unit cost</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isLow = item.current_balance <= item.reorder_level;
                const existingLine = lineByItem.get(item.id);
                return (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-4 py-2">
                      <input type="hidden" name="item_id" value={item.id} />
                      <span className="font-medium text-foreground">{item.name}</span>{" "}
                      <span className="text-muted-foreground">({item.code})</span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={isLow ? "font-medium text-critical" : "text-muted-foreground"}>
                        {item.current_balance} {item.unit_of_measure}
                      </span>{" "}
                      {isLow && <Badge tone="critical" className="ml-1">Low</Badge>}
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        name={`quantity__${item.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        defaultValue={existingLine?.quantity_ordered ?? ""}
                        className="w-28"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        name={`unit_cost__${item.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        defaultValue={existingLine?.unit_cost ?? ""}
                        className="w-28"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {state?.error && (
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{state.error}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving..." : existingPo ? "Save Changes" : "Create Purchase Order"}
        </Button>
      </div>
    </form>
  );
}
