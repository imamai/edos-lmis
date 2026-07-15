"use client";

import { useActionState, useState } from "react";
import { createQuotation, updateQuotation } from "@/lib/actions/quotations";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";

type Row = { key: number; description: string; quantity: string; unit: string; unit_price: string };

type ExistingQuotation = {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  valid_until: string | null;
  notes: string | null;
  is_vat_exempt: boolean;
  items: { description: string; quantity: number; unit_of_measure: string; unit_price: number }[];
};

let rowKeySeq = 0;
function nextKey() {
  rowKeySeq += 1;
  return rowKeySeq;
}

function emptyRow(): Row {
  return { key: nextKey(), description: "", quantity: "1", unit: "piece", unit_price: "" };
}

export function QuotationForm({ existingQuotation }: { existingQuotation?: ExistingQuotation }) {
  const [state, formAction, pending] = useActionState(
    existingQuotation ? updateQuotation : createQuotation,
    null
  );
  const [rows, setRows] = useState<Row[]>(() =>
    existingQuotation && existingQuotation.items.length > 0
      ? existingQuotation.items.map((i) => ({
          key: nextKey(),
          description: i.description,
          quantity: String(i.quantity),
          unit: i.unit_of_measure,
          unit_price: String(i.unit_price),
        }))
      : [emptyRow()]
  );

  function updateRow(key: number, field: keyof Row, value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  const total = rows.reduce((sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0), 0);

  return (
    <form action={formAction} className="space-y-4">
      {existingQuotation && <input type="hidden" name="quotation_id" value={existingQuotation.id} />}
      <Card>
        <CardHeader>
          <CardTitle>Quotation Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="customer_name">Customer / prepared for</Label>
            <Input
              id="customer_name"
              name="customer_name"
              placeholder="General Quotation"
              defaultValue={existingQuotation?.customer_name ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="valid_until">Valid until</Label>
            <Input id="valid_until" name="valid_until" type="date" defaultValue={existingQuotation?.valid_until ?? ""} />
          </div>
          <div>
            <Label htmlFor="customer_email">Customer email</Label>
            <Input
              id="customer_email"
              name="customer_email"
              type="email"
              defaultValue={existingQuotation?.customer_email ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="customer_phone">Customer phone</Label>
            <Input
              id="customer_phone"
              name="customer_phone"
              type="tel"
              defaultValue={existingQuotation?.customer_phone ?? ""}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={existingQuotation?.notes ?? ""} />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
            <input
              type="checkbox"
              name="is_vat_exempt"
              defaultChecked={existingQuotation?.is_vat_exempt ?? false}
              className="h-4 w-4"
            />
            VAT exempt
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Description</th>
                <th className="px-4 py-2 font-medium">Qty</th>
                <th className="px-4 py-2 font-medium">Unit</th>
                <th className="px-4 py-2 font-medium">Unit price</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t border-border align-top">
                  <td className="px-4 py-2">
                    <Input
                      name="item_description"
                      value={row.description}
                      onChange={(e) => updateRow(row.key, "description", e.target.value)}
                      placeholder="e.g. 200W Solar Panel"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      name="item_quantity"
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.quantity}
                      onChange={(e) => updateRow(row.key, "quantity", e.target.value)}
                      className="w-24"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      name="item_unit"
                      value={row.unit}
                      onChange={(e) => updateRow(row.key, "unit", e.target.value)}
                      placeholder="piece"
                      className="w-24"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      name="item_unit_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.unit_price}
                      onChange={(e) => updateRow(row.key, "unit_price", e.target.value)}
                      className="w-28"
                    />
                  </td>
                  <td className="px-4 py-2 text-foreground">
                    {((Number(row.quantity) || 0) * (Number(row.unit_price) || 0)).toFixed(2)}
                  </td>
                  <td className="px-4 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={rows.length === 1}
                      onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between p-4">
            <Button type="button" variant="outline" size="sm" onClick={() => setRows((prev) => [...prev, emptyRow()])}>
              <Plus size={16} /> Add row
            </Button>
            <p className="text-sm font-medium text-foreground">Subtotal: {total.toFixed(2)} (VAT added on save unless exempt)</p>
          </div>
        </CardContent>
      </Card>

      {state?.error && (
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{state.error}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving..." : existingQuotation ? "Save Changes" : "Create Quotation"}
        </Button>
      </div>
    </form>
  );
}
