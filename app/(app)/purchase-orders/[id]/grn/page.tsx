import { getPurchaseOrder } from "@/lib/data/procurement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PdfPreview } from "@/components/pdf-preview";
import Link from "next/link";
import { notFound } from "next/navigation";

const statusTone: Record<string, "neutral" | "warning" | "info" | "success" | "critical"> = {
  draft: "neutral",
  sent: "info",
  confirmed: "info",
  partially_received: "warning",
  received: "success",
  cancelled: "critical",
};

export default async function GrnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: po, error } = await getPurchaseOrder(id);

  if (error) {
    return (
      <div className="space-y-6">
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>
      </div>
    );
  }
  if (!po) notFound();
  if (!["partially_received", "received"].includes(po.status)) notFound();

  const receivedLines = po.lines.filter((line) => line.quantity_received > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">GRN — {po.po_number}</h1>
          <p className="text-sm text-muted-foreground">
            {po.supplier && (
              <Link href={`/suppliers/${po.supplier.id}`} className="text-primary hover:underline">
                {po.supplier.name}
              </Link>
            )}
            {" · "}
            <Link href={`/purchase-orders/${po.id}`} className="text-primary hover:underline">
              View Purchase Order
            </Link>
          </p>
        </div>
        <Badge tone={statusTone[po.status] ?? "neutral"}>{po.status.replace(/_/g, " ")}</Badge>
      </div>

      <PdfPreview src={`/api/purchase-orders/${id}/grn-pdf`} title={`GRN-${po.po_number}.pdf`} />

      <Card>
        <CardHeader>
          <CardTitle>Commodities received</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Commodity</th>
                <th className="px-4 py-2 font-medium">Ordered</th>
                <th className="px-4 py-2 font-medium">Received</th>
                <th className="px-4 py-2 font-medium">Outstanding</th>
                <th className="px-4 py-2 font-medium">Unit Cost</th>
              </tr>
            </thead>
            <tbody>
              {receivedLines.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    No commodities received against this order yet.
                  </td>
                </tr>
              )}
              {receivedLines.map((line) => (
                <tr key={line.id} className="border-t border-border">
                  <td className="px-4 py-2 text-foreground">
                    {line.item?.name} {line.item?.code && <span className="text-muted-foreground">({line.item.code})</span>}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {line.quantity_ordered} {line.item?.unit_of_measure}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {line.quantity_received} {line.item?.unit_of_measure}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {line.quantity_ordered - line.quantity_received} {line.item?.unit_of_measure}
                  </td>
                  <td className="px-4 py-2 text-foreground">
                    {line.unit_cost !== null ? `KES ${line.unit_cost}` : "-"}
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
