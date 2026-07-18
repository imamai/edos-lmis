"use client";

import { useActionState } from "react";
import { createSupplierCatalogItem } from "@/lib/actions/procurement";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

type ItemOption = { id: string; code: string; name: string };

export function SupplierCatalogForm({ supplierId, items }: { supplierId: string; items: ItemOption[] }) {
  const [state, formAction, pending] = useActionState(createSupplierCatalogItem, null);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-5 sm:items-end">
      <input type="hidden" name="supplier_id" value={supplierId} />
      <div className="sm:col-span-2">
        <Label htmlFor="item_id">Commodity</Label>
        <Select id="item_id" name="item_id" required defaultValue="">
          <option value="" disabled>
            Select a commodity
          </option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name} ({i.code})
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="unit_price">Price (KES)</Label>
        <Input id="unit_price" name="unit_price" type="number" step="0.01" min="0.01" required />
      </div>
      <div>
        <Label htmlFor="supplier_sku">Supplier SKU</Label>
        <Input id="supplier_sku" name="supplier_sku" />
      </div>
      <div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Saving..." : "Add / Update"}
        </Button>
      </div>
      {state?.error && <p className="sm:col-span-5 text-sm text-critical">{state.error}</p>}
    </form>
  );
}
