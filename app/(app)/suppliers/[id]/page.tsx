import { createClient } from "@/lib/supabase/server";
import { getSupplier, getSupplierCatalog, getProcurableItems } from "@/lib/data/procurement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SupplierActiveToggle } from "@/components/supplier-active-toggle";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { DeleteCatalogItemButton } from "@/components/delete-catalog-item-button";
import { SupplierCatalogForm } from "@/components/supplier-catalog-form";
import { deleteSupplier } from "@/lib/actions/procurement";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

const poStatusTone: Record<string, "neutral" | "warning" | "info" | "success" | "critical"> = {
  draft: "neutral",
  sent: "info",
  confirmed: "info",
  partially_received: "warning",
  received: "success",
  cancelled: "critical",
};

const billStatusTone: Record<string, "neutral" | "warning" | "info" | "success" | "critical"> = {
  issued: "warning",
  partially_paid: "info",
  paid: "success",
  cancelled: "critical",
};

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await getSupplier(id);
  if (!supplier) notFound();

  const supabase = await createClient();
  const [{ data: orders }, { data: bills }, catalog, procurableItems] = await Promise.all([
    supabase
      .from("edoslmis_purchase_orders")
      .select("id, po_number, status, order_date, expected_date")
      .eq("supplier_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("edoslmis_supplier_bills")
      .select("id, bill_number, bill_date, total_amount, balance_due, status")
      .eq("supplier_id", id)
      .order("created_at", { ascending: false }),
    getSupplierCatalog(id),
    getProcurableItems(),
  ]);

  const orderCount = orders?.length ?? 0;
  const outstandingBillCount = (bills ?? []).filter((b) => b.status !== "cancelled" && Number(b.balance_due) > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{supplier.name}</h1>
          <p className="text-sm text-muted-foreground">
            {supplier.contact_person ?? "No contact person on file"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/suppliers/${supplier.id}/edit`}>
            <Button variant="outline">
              <Pencil size={16} /> Edit
            </Button>
          </Link>
          <SupplierActiveToggle supplierId={supplier.id} isActive={supplier.is_active} />
          <DeleteEntityButton
            id={supplier.id}
            action={deleteSupplier}
            canDelete={orderCount < 2}
            blockedMessage={orderCount >= 2 ? "Has purchase orders on file — deactivate instead." : undefined}
            entityLabel="supplier"
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <p><span className="text-muted-foreground">Phone:</span> {supplier.phone ?? "-"}</p>
          <p><span className="text-muted-foreground">Email:</span> {supplier.email ?? "-"}</p>
          <p className="sm:col-span-2"><span className="text-muted-foreground">Address:</span> {supplier.address ?? "-"}</p>
          <p><span className="text-muted-foreground">Payment terms:</span> {supplier.payment_terms ?? "-"}</p>
          {supplier.bank_details && <p className="sm:col-span-2"><span className="text-muted-foreground">Bank details:</span> {supplier.bank_details}</p>}
          {supplier.notes && <p className="sm:col-span-2"><span className="text-muted-foreground">Notes:</span> {supplier.notes}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Purchase orders</CardTitle>
          <Link href={`/purchase-orders/new?supplier_id=${supplier.id}`} className="text-xs text-primary hover:underline">
            New purchase order
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">PO Number</th>
                <th className="px-4 py-2 font-medium">Order date</th>
                <th className="px-4 py-2 font-medium">Expected</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(orders?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No purchase orders yet.</td>
                </tr>
              )}
              {orders?.map((po) => (
                <tr key={po.id} className="border-t border-border hover:bg-surface-muted">
                  <td className="px-4 py-2">
                    <Link href={`/purchase-orders/${po.id}`} className="font-medium text-primary hover:underline">
                      {po.po_number}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{po.order_date}</td>
                  <td className="px-4 py-2 text-muted-foreground">{po.expected_date ?? "-"}</td>
                  <td className="px-4 py-2">
                    <Badge tone={poStatusTone[po.status] ?? "neutral"}>{po.status.replace(/_/g, " ")}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Supplier bills</CardTitle>
          {outstandingBillCount > 0 && (
            <Link href={`/supplier-bills/pay?supplier=${supplier.id}`} className="text-xs text-primary hover:underline">
              Pay bills ({outstandingBillCount} outstanding)
            </Link>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Bill</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Total</th>
                <th className="px-4 py-2 font-medium">Balance Due</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(bills?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No supplier bills yet.</td>
                </tr>
              )}
              {bills?.map((bill) => (
                <tr key={bill.id} className="border-t border-border hover:bg-surface-muted">
                  <td className="px-4 py-2">
                    <Link href={`/supplier-bills/${bill.id}`} className="font-medium text-primary hover:underline">
                      {bill.bill_number}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{bill.bill_date}</td>
                  <td className="px-4 py-2 text-foreground">KES {bill.total_amount}</td>
                  <td className="px-4 py-2">
                    <span className={Number(bill.balance_due) > 0 ? "font-medium text-critical" : "text-muted-foreground"}>
                      KES {bill.balance_due}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone={billStatusTone[bill.status] ?? "neutral"}>{bill.status.replace(/_/g, " ")}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Catalogue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Known prices for this supplier — applied as a one-click starting point when building a purchase order,
            instead of typing every unit cost by hand.
          </p>
          <SupplierCatalogForm supplierId={supplier.id} items={procurableItems} />
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Commodity</th>
                  <th className="px-4 py-2 font-medium">Supplier SKU</th>
                  <th className="px-4 py-2 font-medium">Price</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {catalog.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                      No catalogue prices yet.
                    </td>
                  </tr>
                )}
                {catalog.map((entry) => (
                  <tr key={entry.id} className="border-t border-border">
                    <td className="px-4 py-2 text-foreground">
                      {entry.itemName} <span className="text-muted-foreground">({entry.itemCode})</span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{entry.supplierSku ?? "-"}</td>
                    <td className="px-4 py-2 font-medium text-foreground">
                      KES {entry.unitPrice} / {entry.unitOfMeasure}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <DeleteCatalogItemButton catalogItemId={entry.id} supplierId={supplier.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
