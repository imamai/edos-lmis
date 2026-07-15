import { getSupplierBill } from "@/lib/data/supplier-bills";
import { getSettingsList } from "@/lib/data/settings-lists";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SupplierPaymentForm } from "@/components/supplier-payment-form";
import { CancelSupplierBillButton } from "@/components/cancel-supplier-bill-button";
import { SupplierInvoiceNumberForm } from "@/components/supplier-invoice-number-form";
import { updateSupplierBillSupplierInvoiceNumber } from "@/lib/actions/supplier-bills";
import { PdfPreview } from "@/components/pdf-preview";
import Link from "next/link";
import { notFound } from "next/navigation";

const statusTone: Record<string, "neutral" | "warning" | "info" | "success" | "critical"> = {
  issued: "warning",
  partially_paid: "info",
  paid: "success",
  cancelled: "critical",
};

export default async function SupplierBillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ data: bill, error }, paymentMethods] = await Promise.all([
    getSupplierBill(id),
    getSettingsList("payment_method"),
  ]);

  if (error) {
    return (
      <div className="space-y-6">
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>
      </div>
    );
  }
  if (!bill) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{bill.bill_number}</h1>
          <p className="text-sm text-muted-foreground">
            {bill.supplier && (
              <Link href={`/suppliers/${bill.supplier.id}`} className="text-primary hover:underline">
                {bill.supplier.name}
              </Link>
            )}
            {" · "}
            <Link href={`/purchase-orders/${bill.po_id}`} className="text-primary hover:underline">
              View Purchase Order
            </Link>
          </p>
        </div>
        <Badge tone={statusTone[bill.status] ?? "neutral"}>{bill.status.replace(/_/g, " ")}</Badge>
      </div>

      {bill.status !== "cancelled" && (
        <SupplierInvoiceNumberForm
          action={updateSupplierBillSupplierInvoiceNumber}
          idField="bill_id"
          idValue={bill.id}
          initialValue={bill.supplier_invoice_number}
        />
      )}

      <PdfPreview src={`/api/supplier-bills/${id}/pdf`} title={`${bill.bill_number}.pdf`} />

      {bill.status === "cancelled" && bill.cancellation_reason && (
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">
          Cancelled: {bill.cancellation_reason}
        </p>
      )}

      {bill.status !== "cancelled" && Number(bill.amount_paid) === 0 && (
        <div>
          <CancelSupplierBillButton billId={id} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-xl font-semibold text-foreground">KES {bill.total_amount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Amount Paid</p>
            <p className="text-xl font-semibold text-success">KES {bill.amount_paid}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-muted-foreground">Balance Due</p>
            <p className={`text-xl font-semibold ${bill.balance_due > 0 ? "text-critical" : "text-foreground"}`}>
              KES {bill.balance_due}
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
                <th className="px-4 py-2 font-medium">Unit Cost</th>
                <th className="px-4 py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-4 py-2 text-foreground">{item.description}</td>
                  <td className="px-4 py-2 text-muted-foreground">{item.quantity}</td>
                  <td className="px-4 py-2 text-muted-foreground">KES {item.unit_cost}</td>
                  <td className="px-4 py-2 text-foreground">KES {item.total_amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {bill.balance_due > 0 && bill.status !== "cancelled" && (
        <Card>
          <CardHeader>
            <CardTitle>Record Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <SupplierPaymentForm billId={id} balanceDue={bill.balance_due} methods={paymentMethods} />
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
              {bill.payments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No payments recorded yet.</td>
                </tr>
              )}
              {bill.payments.map((p) => (
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
    </div>
  );
}
