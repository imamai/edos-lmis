"use client";

import { useActionState } from "react";
import { createRfq, updateRfq } from "@/lib/actions/procurement";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SupplierRow = { id: string; name: string };
type ItemRow = { id: string; code: string; name: string; unit_of_measure: string };
type ExistingRfq = {
  id: string;
  expected_date: string | null;
  notes: string | null;
  lines: { item_id: string; quantity_requested: number }[];
};

export function RfqForm({
  suppliers,
  items,
  existingRfq,
}: {
  suppliers: SupplierRow[];
  items: ItemRow[];
  existingRfq?: ExistingRfq;
}) {
  const [state, formAction, pending] = useActionState(existingRfq ? updateRfq : createRfq, null);
  const lineByItem = new Map((existingRfq?.lines ?? []).map((l) => [l.item_id, l]));

  return (
    <form action={formAction} className="space-y-4">
      {existingRfq && <input type="hidden" name="rfq_id" value={existingRfq.id} />}
      {!existingRfq && (
        <Card>
          <CardHeader>
            <CardTitle>Send to suppliers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {suppliers.length === 0 && <p className="text-sm text-muted-foreground">No active suppliers on file.</p>}
            {suppliers.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="supplier_id" value={s.id} className="h-4 w-4" />
                {s.name}
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Request details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="expected_date">Quotes needed by</Label>
            <Input id="expected_date" name="expected_date" type="date" defaultValue={existingRfq?.expected_date ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={existingRfq?.notes ?? ""} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commodities to quote</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Commodity</th>
                <th className="px-4 py-2 font-medium">Quantity requested</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const existingLine = lineByItem.get(item.id);
                return (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-4 py-2">
                      <input type="hidden" name="item_id" value={item.id} />
                      <span className="font-medium text-foreground">{item.name}</span>{" "}
                      <span className="text-muted-foreground">({item.code})</span>
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        name={`quantity__${item.id}`}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        defaultValue={existingLine?.quantity_requested ?? ""}
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
          {pending ? "Saving..." : existingRfq ? "Save Changes" : "Create RFQ"}
        </Button>
      </div>
    </form>
  );
}
