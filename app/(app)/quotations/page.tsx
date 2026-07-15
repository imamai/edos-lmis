import { getQuotations } from "@/lib/data/quotations";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const statusTone: Record<string, "neutral" | "warning" | "info" | "success" | "critical"> = {
  draft: "neutral",
  sent: "info",
  accepted: "success",
  rejected: "critical",
  expired: "warning",
};

export default async function QuotationsPage() {
  const { data: quotations, error } = await getQuotations();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Quotations</h1>
          <p className="text-sm text-muted-foreground">Price quotations issued to customers</p>
        </div>
        <Link href="/quotations/new">
          <Button>New Quotation</Button>
        </Link>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Quote Number</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Valid Until</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-critical">{error}</td>
              </tr>
            )}
            {!error && quotations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No quotations yet.</td>
              </tr>
            )}
            {quotations.map((q) => (
              <tr key={q.id} className="border-t border-border hover:bg-surface-muted">
                <td className="px-4 py-3">
                  <Link href={`/quotations/${q.id}`} className="font-medium text-primary hover:underline">
                    {q.quotation_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{q.customer_name ?? "General Quotation"}</td>
                <td className="px-4 py-3 text-muted-foreground">{q.quote_date}</td>
                <td className="px-4 py-3 text-muted-foreground">{q.valid_until ?? "-"}</td>
                <td className="px-4 py-3 text-foreground">{q.total_amount.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone[q.status] ?? "neutral"}>{q.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
