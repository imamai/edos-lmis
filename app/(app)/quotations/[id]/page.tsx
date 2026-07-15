import { getQuotation } from "@/lib/data/quotations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PdfPreview } from "@/components/pdf-preview";
import { QuotationStatusActions } from "@/components/quotation-status-actions";
import { ResendQuotationButton } from "@/components/resend-quotation-button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

const statusTone: Record<string, "neutral" | "warning" | "info" | "success" | "critical"> = {
  draft: "neutral",
  sent: "info",
  accepted: "success",
  rejected: "critical",
  expired: "warning",
};

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: quotation, error: quotationError } = await getQuotation(id);
  if (quotationError) {
    return (
      <div className="space-y-6">
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{quotationError}</p>
      </div>
    );
  }
  if (!quotation) notFound();

  const canEdit = ["draft", "sent"].includes(quotation.status);
  const canResend = quotation.revision > 0 && !["accepted", "rejected", "expired"].includes(quotation.status);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{quotation.quotation_number}</h1>
          <p className="text-sm text-muted-foreground">
            {quotation.customer_name ?? "General Quotation"} &middot; {quotation.quote_date}
            {quotation.valid_until && <> &middot; Valid until {quotation.valid_until}</>}
          </p>
        </div>
        <div className="text-right">
          <Badge tone={statusTone[quotation.status] ?? "neutral"}>{quotation.status}</Badge>
          <p className="mt-1 text-sm font-medium text-foreground">Total: {quotation.total_amount.toFixed(2)}</p>
          {quotation.revision > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Rev. {quotation.revision}
              {quotation.corrected_at && ` · corrected ${new Date(quotation.corrected_at).toLocaleDateString()}`}
            </p>
          )}
        </div>
      </div>

      {quotation.notes && (
        <Card>
          <CardContent className="text-sm text-muted-foreground">{quotation.notes}</CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {canEdit && (
          <Link href={`/quotations/${quotation.id}/edit`}>
            <Button variant="outline">
              <Pencil size={16} /> Edit
            </Button>
          </Link>
        )}
        <QuotationStatusActions quotationId={quotation.id} status={quotation.status} />
        {canResend && <ResendQuotationButton quotationId={quotation.id} />}
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
                <th className="px-4 py-2 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {quotation.items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-4 py-2 text-foreground">{item.description}</td>
                  <td className="px-4 py-2 text-muted-foreground">{item.quantity} {item.unit_of_measure}</td>
                  <td className="px-4 py-2 text-muted-foreground">{item.unit_price}</td>
                  <td className="px-4 py-2 text-foreground">{item.total_amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <PdfPreview src={`/api/quotations/${quotation.id}/pdf`} title={`${quotation.quotation_number}.pdf`} />
    </div>
  );
}
