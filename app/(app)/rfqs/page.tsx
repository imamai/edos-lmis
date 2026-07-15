import { getRfqs } from "@/lib/data/procurement";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const statusTone: Record<string, "neutral" | "warning" | "info" | "success" | "critical"> = {
  draft: "neutral",
  sent: "info",
  closed: "warning",
  converted: "success",
  cancelled: "critical",
};

export default async function RfqsPage() {
  const { data: rfqs, error } = await getRfqs();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Requests for Quotation</h1>
          <p className="text-sm text-muted-foreground">Ask suppliers for pricing before raising a purchase order</p>
        </div>
        <Link href="/rfqs/new">
          <Button>New RFQ</Button>
        </Link>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">RFQ Number</th>
              <th className="px-4 py-3 font-medium">Suppliers</th>
              <th className="px-4 py-3 font-medium">Needed by</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-critical">{error}</td>
              </tr>
            )}
            {!error && rfqs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No RFQs yet.</td>
              </tr>
            )}
            {rfqs.map((rfq) => (
              <tr key={rfq.id} className="border-t border-border hover:bg-surface-muted">
                <td className="px-4 py-3">
                  <Link href={`/rfqs/${rfq.id}`} className="font-medium text-primary hover:underline">
                    {rfq.rfq_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{rfq.supplier_count}</td>
                <td className="px-4 py-3 text-muted-foreground">{rfq.expected_date ?? "-"}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone[rfq.status] ?? "neutral"}>{rfq.status.replace(/_/g, " ")}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
