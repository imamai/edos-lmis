"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { createPurchaseOrder, updatePurchaseOrder } from "@/lib/actions/procurement";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";

type SupplierRow = { id: string; name: string };
type ItemRow = { id: string; code: string; name: string; unit_of_measure: string; reorder_level: number; current_balance: number };
type CatalogPriceEntry = { supplierId: string; itemId: string; unitPrice: number };
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
  catalogPrices,
  defaultSupplierId,
  existingPo,
}: {
  suppliers: SupplierRow[];
  items: ItemRow[];
  catalogPrices: CatalogPriceEntry[];
  defaultSupplierId?: string;
  existingPo?: ExistingPo;
}) {
  const [state, formAction, pending] = useActionState(
    existingPo ? updatePurchaseOrder : createPurchaseOrder,
    null
  );
  const lineByItem = new Map((existingPo?.lines ?? []).map((l) => [l.item_id, l]));
  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const [supplierId, setSupplierId] = useState(existingPo?.supplier_id ?? defaultSupplierId ?? "");
  const [quantities, setQuantities] = useState<Record<string, string>>(
    Object.fromEntries(items.map((item) => [item.id, String(lineByItem.get(item.id)?.quantity_ordered ?? "")]))
  );
  const [unitCosts, setUnitCosts] = useState<Record<string, string>>(
    Object.fromEntries(items.map((item) => [item.id, String(lineByItem.get(item.id)?.unit_cost ?? "")]))
  );
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [checkedCatalogItems, setCheckedCatalogItems] = useState<Set<string>>(new Set());
  const [catalogQuantities, setCatalogQuantities] = useState<Record<string, string>>({});

  const selectedSupplierName = suppliers.find((s) => s.id === supplierId)?.name ?? "";
  const supplierCatalog = useMemo(
    () => catalogPrices.filter((c) => c.supplierId === supplierId && itemById.has(c.itemId)),
    [catalogPrices, supplierId, itemById]
  );
  const catalogByItem = useMemo(() => new Map(supplierCatalog.map((c) => [c.itemId, c.unitPrice])), [supplierCatalog]);

  function openCatalog() {
    setCheckedCatalogItems(new Set(supplierCatalog.map((c) => c.itemId)));
    setCatalogQuantities(
      Object.fromEntries(supplierCatalog.map((c) => [c.itemId, quantities[c.itemId] || "1"]))
    );
    setCatalogOpen(true);
  }

  function toggleCatalogItem(itemId: string) {
    setCheckedCatalogItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function addCheckedItemsToOrder() {
    setQuantities((prev) => {
      const next = { ...prev };
      for (const itemId of checkedCatalogItems) next[itemId] = catalogQuantities[itemId] || "1";
      return next;
    });
    setUnitCosts((prev) => {
      const next = { ...prev };
      for (const itemId of checkedCatalogItems) next[itemId] = String(catalogByItem.get(itemId));
      return next;
    });
    setCatalogOpen(false);
  }

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
            <div className="flex items-center gap-2">
              <Select
                id="supplier_id"
                name="supplier_id"
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="" disabled>Select a supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
              <Button
                type="button"
                variant="outline"
                className="shrink-0 whitespace-nowrap"
                disabled={!supplierId}
                title={supplierId ? undefined : "Select a supplier first"}
                onClick={openCatalog}
              >
                Supplier Catalogue{supplierCatalog.length > 0 ? ` (${supplierCatalog.length})` : ""}
              </Button>
            </div>
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
                const catalogPrice = catalogByItem.get(item.id);
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
                        value={quantities[item.id] ?? ""}
                        onChange={(e) => setQuantities((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        className="w-28"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <Input
                          name={`unit_cost__${item.id}`}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={unitCosts[item.id] ?? ""}
                          onChange={(e) => setUnitCosts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          className="w-28"
                        />
                        {catalogPrice !== undefined && (
                          <span className="shrink-0 text-xs text-muted-foreground" title="This supplier's catalogue price">
                            (cat. {catalogPrice})
                          </span>
                        )}
                      </div>
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

      <Dialog
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        title={selectedSupplierName ? `${selectedSupplierName} — catalogue` : "Supplier catalogue"}
      >
        <div className="space-y-4">
          {supplierCatalog.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {selectedSupplierName || "This supplier"} has no catalogue prices on file yet. Add commodity prices
              from{" "}
              <Link href={`/suppliers/${supplierId}`} className="text-primary hover:underline">
                their supplier page
              </Link>{" "}
              to pick from them here next time.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Check the commodities to add, set a quantity for each, and confirm — this fills in Quantity and
                Unit cost on the order below using this supplier&apos;s prices. You can still edit either
                afterward.
              </p>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface-muted text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2" />
                      <th className="px-3 py-2 font-medium">Commodity</th>
                      <th className="px-3 py-2 font-medium">Price</th>
                      <th className="px-3 py-2 font-medium">Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierCatalog.map(({ itemId, unitPrice }) => {
                      const item = itemById.get(itemId);
                      if (!item) return null;
                      return (
                        <tr key={itemId} className="border-t border-border">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={checkedCatalogItems.has(itemId)}
                              onChange={() => toggleCatalogItem(itemId)}
                              aria-label={`Select ${item.name}`}
                            />
                          </td>
                          <td className="px-3 py-2 text-foreground">
                            {item.name} <span className="text-muted-foreground">({item.code})</span>
                          </td>
                          <td className="px-3 py-2 font-medium text-foreground">
                            KES {unitPrice} / {item.unit_of_measure}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={catalogQuantities[itemId] ?? ""}
                              onChange={(e) =>
                                setCatalogQuantities((prev) => ({ ...prev, [itemId]: e.target.value }))
                              }
                              disabled={!checkedCatalogItems.has(itemId)}
                              className="w-24"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCatalogOpen(false)}>
              {supplierCatalog.length === 0 ? "Close" : "Cancel"}
            </Button>
            {supplierCatalog.length > 0 && (
              <Button type="button" disabled={checkedCatalogItems.size === 0} onClick={addCheckedItemsToOrder}>
                Add {checkedCatalogItems.size} item{checkedCatalogItems.size === 1 ? "" : "s"} to order
              </Button>
            )}
          </div>
        </div>
      </Dialog>
    </form>
  );
}
