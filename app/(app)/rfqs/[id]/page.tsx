import { getRfq } from "@/lib/data/procurement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RfqSendButton } from "@/components/rfq-send-button";
import { ResendRfqButton } from "@/components/resend-rfq-button";
import { RfqResponseForm } from "@/components/rfq-response-form";
import { CloseRfqButton } from "@/components/close-rfq-button";
import { PdfPreview } from "@/components/pdf-preview";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

const statusTone: Record<string, "neutral" | "warning" | "info" | "success" | "critical"> = {
  draft: "neutral",
  sent: "info",
  closed: "warning",
  converted: "success",
  cancelled: "critical",
};

export default async function RfqDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: rfq, error } = await getRfq(id);
  if (error) {
    return (
      <div className="space-y-6">
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>
      </div>
    );
  }
  if (!rfq) notFound();

  const canSend = rfq.status === "draft";
  const canClose = ["draft", "sent"].includes(rfq.status);
  const canEdit = ["draft", "sent"].includes(rfq.status);
  const canResend = rfq.revision > 0 && !["cancelled"].includes(rfq.status);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{rfq.rfq_number}</h1>
          <p className="text-sm text-muted-foreground">
            {rfq.suppliers.length} supplier(s)
            {rfq.expected_date && <> · Needed by {rfq.expected_date}</>}
          </p>
        </div>
        <div className="text-right">
          <Badge tone={statusTone[rfq.status] ?? "neutral"}>{rfq.status.replace(/_/g, " ")}</Badge>
          {rfq.revision > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Rev. {rfq.revision}{rfq.corrected_at && ` · corrected ${new Date(rfq.corrected_at).toLocaleDateString()}`}
            </p>
          )}
        </div>
      </div>

      <PdfPreview src={`/api/rfqs/${rfq.id}/pdf`} title={`${rfq.rfq_number}.pdf`} />

      {rfq.notes && (
        <Card>
          <CardContent className="text-sm text-muted-foreground">{rfq.notes}</CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {canEdit && (
          <Link href={`/rfqs/${rfq.id}/edit`}>
            <Button variant="outline">
              <Pencil size={16} /> Edit
            </Button>
          </Link>
        )}
        {canSend && <RfqSendButton rfqId={rfq.id} />}
        {canResend && <ResendRfqButton rfqId={rfq.id} />}
        {canClose && <CloseRfqButton rfqId={rfq.id} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commodities requested</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Commodity</th>
                <th className="px-4 py-2 font-medium">Quantity requested</th>
              </tr>
            </thead>
            <tbody>
              {rfq.lines.map((line) => (
                <tr key={line.id} className="border-t border-border">
                  <td className="px-4 py-2">
                    <span className="font-medium text-foreground">{line.item?.name ?? "Unknown item"}</span>{" "}
                    <span className="text-muted-foreground">({line.item?.code})</span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {line.quantity_requested} {line.item?.unit_of_measure}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supplier responses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Supplier</th>
                <th className="px-4 py-2 font-medium">Sent</th>
                <th className="px-4 py-2 font-medium">Quote</th>
              </tr>
            </thead>
            <tbody>
              {rfq.suppliers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">No suppliers selected.</td>
                </tr>
              )}
              {rfq.suppliers.map((s) => (
                <tr key={s.id} className="border-t border-border align-top">
                  <td className="px-4 py-2">
                    {s.supplier ? (
                      <Link href={`/suppliers/${s.supplier.id}`} className="font-medium text-primary hover:underline">
                        {s.supplier.name}
                      </Link>
                    ) : (
                      "-"
                    )}
                    {!s.supplier?.email && <p className="text-xs text-muted-foreground">No email on file</p>}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {s.sent_at ? new Date(s.sent_at).toLocaleDateString() : "-"}
                  </td>
                  <td className="px-4 py-2">
                    <RfqResponseForm
                      rfqId={rfq.id}
                      rfqSupplierId={s.id}
                      quotedTotal={s.quoted_total}
                      respondedAt={s.responded_at}
                    />
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
