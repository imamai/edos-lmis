import { createClient } from "@/lib/supabase/server";
import { getSupplier } from "@/lib/data/procurement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SupplierActiveToggle } from "@/components/supplier-active-toggle";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { deleteSupplier } from "@/lib/actions/procurement";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

const statusTone: Record<string, "neutral" | "warning" | "info" | "success" | "critical"> = {
  draft: "neutral",
  sent: "info",
  confirmed: "info",
  partially_received: "warning",
  received: "success",
  cancelled: "critical",
};

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await getSupplier(id);
  if (!supplier) notFound();

  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("edoslmis_purchase_orders")
    .select("id, po_number, status, order_date, expected_date")
    .eq("supplier_id", id)
    .order("created_at", { ascending: false });

  const orderCount = orders?.length ?? 0;

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
                    <Badge tone={statusTone[po.status] ?? "neutral"}>{po.status.replace(/_/g, " ")}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
