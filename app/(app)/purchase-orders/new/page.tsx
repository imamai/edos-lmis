import { getSuppliers, getProcurableItems, getAllSupplierCatalogPrices } from "@/lib/data/procurement";
import { PurchaseOrderForm } from "@/components/purchase-order-form";

export default async function NewPurchaseOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ supplier_id?: string }>;
}) {
  const { supplier_id } = await searchParams;
  const [{ data: suppliers }, items, catalogPrices] = await Promise.all([
    getSuppliers(),
    getProcurableItems(),
    getAllSupplierCatalogPrices(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">New Purchase Order</h1>
        <p className="text-sm text-muted-foreground">Order commodities/reagents from a supplier</p>
      </div>
      <PurchaseOrderForm
        suppliers={suppliers.filter((s) => s.is_active)}
        items={items}
        defaultSupplierId={supplier_id}
        catalogPrices={catalogPrices}
      />
    </div>
  );
}
