import { getPurchaseOrders } from "@/lib/data/procurement";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const statusTone: Record<string, "neutral" | "warning" | "info" | "success" | "critical"> = {
  draft: "neutral",
  sent: "info",
  confirmed: "info",
  partially_received: "warning",
  received: "success",
  cancelled: "critical",
};

export default async function PurchaseOrdersPage() {
  const { data: orders, error } = await getPurchaseOrders();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">Commodity/reagent purchase orders and receiving</p>
        </div>
        <Link href="/purchase-orders/new">
          <Button>New Purchase Order</Button>
        </Link>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">PO Number</th>
              <th className="px-4 py-3 font-medium">Supplier</th>
              <th className="px-4 py-3 font-medium">Lines</th>
              <th className="px-4 py-3 font-medium">Order date</th>
              <th className="px-4 py-3 font-medium">Expected</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-critical">{error}</td>
              </tr>
            )}
            {!error && orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No purchase orders yet.</td>
              </tr>
            )}
            {orders.map((po) => (
              <tr key={po.id} className="border-t border-border hover:bg-surface-muted">
                <td className="px-4 py-3">
                  <Link href={`/purchase-orders/${po.id}`} className="font-medium text-primary hover:underline">
                    {po.po_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{po.supplier?.name ?? "-"}</td>
                <td className="px-4 py-3 text-muted-foreground">{po.line_count}</td>
                <td className="px-4 py-3 text-muted-foreground">{po.order_date}</td>
                <td className="px-4 py-3 text-muted-foreground">{po.expected_date ?? "-"}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone[po.status] ?? "neutral"}>{po.status.replace(/_/g, " ")}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
