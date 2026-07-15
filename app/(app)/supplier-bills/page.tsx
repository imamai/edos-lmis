import { getSupplierBills } from "@/lib/data/supplier-bills";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const statusTone: Record<string, "neutral" | "warning" | "info" | "success" | "critical"> = {
  issued: "warning",
  partially_paid: "info",
  paid: "success",
  cancelled: "critical",
};

export default async function SupplierBillsPage() {
  const { data: bills, error } = await getSupplierBills();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Supplier Bills</h1>
        <p className="text-sm text-muted-foreground">Money owed to suppliers, generated from received purchase orders</p>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Bill</th>
              <th className="px-4 py-3 font-medium">Supplier</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Balance Due</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-critical">{error}</td>
              </tr>
            )}
            {!error && bills.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No supplier bills yet.</td>
              </tr>
            )}
            {bills.map((bill) => (
              <tr key={bill.id} className="border-t border-border hover:bg-surface-muted">
                <td className="px-4 py-3">
                  <Link href={`/supplier-bills/${bill.id}`} className="font-medium text-primary hover:underline">
                    {bill.bill_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{bill.supplier?.name ?? "-"}</td>
                <td className="px-4 py-3 text-foreground">KES {bill.total_amount}</td>
                <td className="px-4 py-3">
                  <span className={bill.balance_due > 0 ? "font-medium text-critical" : "text-muted-foreground"}>
                    KES {bill.balance_due}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone[bill.status] ?? "neutral"}>{bill.status.replace(/_/g, " ")}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
