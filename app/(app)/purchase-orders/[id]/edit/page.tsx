import { getPurchaseOrder, getSuppliers, getProcurableItems, getAllSupplierCatalogPrices } from "@/lib/data/procurement";
import { PurchaseOrderForm } from "@/components/purchase-order-form";
import { notFound } from "next/navigation";

export default async function EditPurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ data: po, error: poError }, { data: suppliers }, items, catalogPrices] = await Promise.all([
    getPurchaseOrder(id),
    getSuppliers(),
    getProcurableItems(),
    getAllSupplierCatalogPrices(),
  ]);

  if (poError) {
    return (
      <div className="space-y-6">
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{poError}</p>
      </div>
    );
  }
  if (!po) notFound();
  if (!["draft", "sent", "confirmed"].includes(po.status)) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Edit Purchase Order</h1>
        <p className="text-sm text-muted-foreground">
          {po.po_number}
          {po.status === "draft"
            ? " · still in draft"
            : " · already sent — saving will mark this as a correction and you'll need to resend it"}
        </p>
      </div>
      <PurchaseOrderForm
        suppliers={suppliers.filter((s) => s.is_active)}
        items={items}
        catalogPrices={catalogPrices}
        existingPo={{
          id: po.id,
          supplier_id: po.supplier?.id ?? "",
          expected_date: po.expected_date,
          notes: po.notes,
          lines: po.lines.map((l) => ({
            item_id: l.item?.id ?? "",
            quantity_ordered: l.quantity_ordered,
            unit_cost: l.unit_cost,
          })),
        }}
      />
    </div>
  );
}
