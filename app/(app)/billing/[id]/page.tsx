import { createClient } from "@/lib/supabase/server";
import { getSettingsList } from "@/lib/data/settings-lists";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaymentForm } from "@/components/payment-form";
import { NewClaimForm, ClaimStatusForm } from "@/components/insurance-claim-panel";
import { CancelInvoiceButton } from "@/components/cancel-invoice-button";
import { PdfPreview } from "@/components/pdf-preview";
import Link from "next/link";
import { notFound } from "next/navigation";

const statusTone: Record<string, "neutral" | "warning" | "info" | "success" | "critical"> = {
  draft: "neutral",
  issued: "warning",
  partially_paid: "info",
  paid: "success",
  cancelled: "critical",
  written_off: "critical",
  pending: "neutral",
  submitted: "info",
  approved: "success",
  rejected: "critical",
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice, error: invoiceError } = await supabase
    .from("edoslmis_invoices")
    .select(
      "id, invoice_number, total_amount, amount_paid, balance_due, status, payer_type, order_id, cancellation_reason, edoslmis_patients(id, first_name, last_name, patient_number)"
    )
    .eq("id", id)
    .single();

  if (invoiceError) {
    return (
      <div className="space-y-6">
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{invoiceError.message}</p>
      </div>
    );
  }
  if (!invoice) notFound();

  const [{ data: items }, { data: payments }, { data: claims }, paymentMethods] = await Promise.all([
    supabase
      .from("edoslmis_invoice_items")
      .select("id, description, quantity, unit_price, total_amount")
      .eq("invoice_id", id),
    supabase
      .from("edoslmis_payments")
      .select("id, amount, payment_method, reference_number, paid_at")
      .eq("invoice_id", id)
      .order("paid_at", { ascending: false }),
    supabase
      .from("edoslmis_insurance_claims")
      .select("id, scheme_name, policy_number, claim_number, status, approved_amount, rejection_reason")
      .eq("invoice_id", id),
    getSettingsList("payment_method"),
  ]);

  const patient = invoice.edoslmis_patients as unknown as {
    id: string; first_name: string; last_name: string; patient_number: string;
  } | null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{invoice.invoice_number}</h1>
          {patient && (
            <p className="text-sm text-muted-foreground">
              <Link href={`/patients/${patient.id}`} className="text-primary hover:underline">
                {patient.first_name} {patient.last_name} ({patient.patient_number})
              </Link>
              {invoice.order_id && (
                <>
                  {" "}&middot;{" "}
                  <Link href={`/orders/${invoice.order_id}`} className="text-primary hover:underline">
                    View Order
                  </Link>
                </>
              )}
            </p>
          )}
        </div>
        <div className="text-right">
          <Badge tone={statusTone[invoice.status] ?? "neutral"}>{invoice.status.replace(/_/g, " ")}</Badge>
          <p className="mt-1 text-sm text-muted-foreground">Payer: {invoice.payer_type.replace(/_/g, " ")}</p>
        </div>
      </div>

      <PdfPreview src={`/api/billing/${id}/pdf`} title={`${invoice.invoice_number}.pdf`} />

      {invoice.status === "cancelled" && invoice.cancellation_reason && (
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">
          Cancelled: {invoice.cancellation_reason}
        </p>
      )}

      {invoice.status !== "cancelled" && Number(invoice.amount_paid) === 0 && (
        <div>
          <CancelInvoiceButton invoiceId={id} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-xl font-semibold text-foreground">KES {invoice.total_amount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Amount Paid</p>
            <p className="text-xl font-semibold text-success">KES {invoice.amount_paid}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Balance Due</p>
            <p className={`text-xl font-semibold ${invoice.balance_due > 0 ? "text-critical" : "text-foreground"}`}>
              KES {invoice.balance_due}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Description</th>
                <th className="px-4 py-2 font-medium">Qty</th>
                <th className="px-4 py-2 font-medium">Unit Price</th>
                <th className="px-4 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {items?.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-4 py-2 text-foreground">{item.description}</td>
                  <td className="px-4 py-2 text-muted-foreground">{item.quantity}</td>
                  <td className="px-4 py-2 text-muted-foreground">KES {item.unit_price}</td>
                  <td className="px-4 py-2 text-foreground">KES {item.total_amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {invoice.balance_due > 0 && invoice.status !== "cancelled" && (
        <Card>
          <CardHeader>
            <CardTitle>Record Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentForm invoiceId={id} balanceDue={invoice.balance_due} methods={paymentMethods} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Method</th>
                <th className="px-4 py-2 font-medium">Reference</th>
                <th className="px-4 py-2 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(payments?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No payments recorded yet.</td>
                </tr>
              )}
              {payments?.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-2 text-muted-foreground">{new Date(p.paid_at).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <Badge tone="neutral">{p.payment_method.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{p.reference_number ?? "-"}</td>
                  <td className="px-4 py-2 font-medium text-success">KES {p.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Insurance / NHIF / SHA Claims</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {claims?.map((claim) => (
            <div key={claim.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  {claim.scheme_name} {claim.claim_number && `(${claim.claim_number})`}
                </p>
                <Badge tone={statusTone[claim.status] ?? "neutral"}>{claim.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Policy: {claim.policy_number ?? "-"}</p>
              <ClaimStatusForm claim={claim} invoiceId={id} />
            </div>
          ))}
          {invoice.payer_type !== "self_pay" && <NewClaimForm invoiceId={id} />}
        </CardContent>
      </Card>
    </div>
  );
}
