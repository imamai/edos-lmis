import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CancelInvoiceButton } from "@/components/cancel-invoice-button";
import Link from "next/link";

const statusTone: Record<string, "neutral" | "warning" | "info" | "success" | "critical"> = {
  draft: "neutral",
  issued: "warning",
  partially_paid: "info",
  paid: "success",
  cancelled: "critical",
  written_off: "critical",
};

export default async function BillingPage() {
  const supabase = await createClient();

  const { data: invoices, error } = await supabase
    .from("edoslmis_invoices")
    .select(
      "id, invoice_number, total_amount, amount_paid, balance_due, status, payer_type, issued_at, edoslmis_patients(first_name, last_name, patient_number)"
    )
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Billing</h1>
        <p className="text-sm text-muted-foreground">Invoices, payments, and insurance claims</p>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium">Patient</th>
              <th className="px-4 py-3 font-medium">Payer</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Balance Due</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-critical">{error.message}</td>
              </tr>
            )}
            {!error && (invoices?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">No invoices yet.</td>
              </tr>
            )}
            {invoices?.map((inv) => {
              const patient = inv.edoslmis_patients as unknown as {
                first_name: string; last_name: string; patient_number: string;
              } | null;
              return (
                <tr key={inv.id} className="border-t border-border hover:bg-surface-muted">
                  <td className="px-4 py-3">
                    <Link href={`/billing/${inv.id}`} className="font-medium text-primary hover:underline">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {patient ? `${patient.first_name} ${patient.last_name} (${patient.patient_number})` : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="neutral">{inv.payer_type.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="px-4 py-3 text-foreground">KES {inv.total_amount}</td>
                  <td className="px-4 py-3">
                    <span className={inv.balance_due > 0 ? "font-medium text-critical" : "text-muted-foreground"}>
                      KES {inv.balance_due}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone[inv.status] ?? "neutral"}>{inv.status.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {inv.status !== "cancelled" && Number(inv.amount_paid) === 0 && (
                      <CancelInvoiceButton invoiceId={inv.id} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
