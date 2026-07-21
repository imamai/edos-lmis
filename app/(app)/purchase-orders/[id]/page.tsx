import { getPurchaseOrder } from "@/lib/data/procurement";
import { getSupplierBillByPoId } from "@/lib/data/supplier-bills";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SendPoButton } from "@/components/send-po-button";
import { ConfirmPoButton } from "@/components/confirm-po-button";
import { CancelPoButton } from "@/components/cancel-po-button";
import { ReceivePoLineForm } from "@/components/receive-po-line-form";
import { CorrectPoLineReceiptForm } from "@/components/correct-po-line-receipt-form";
import { GenerateSupplierBillButton } from "@/components/generate-supplier-bill-button";
import { ResendPoButton } from "@/components/resend-po-button";
import { SupplierInvoiceNumberForm } from "@/components/supplier-invoice-number-form";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { updatePurchaseOrderSupplierInvoiceNumber, deletePurchaseOrder } from "@/lib/actions/procurement";
import { PdfPreview } from "@/components/pdf-preview";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, FileText } from "lucide-react";

const statusTone: Record<string, "neutral" | "warning" | "info" | "success" | "critical"> = {
  draft: "neutral",
  sent: "info",
  confirmed: "info",
  partially_received: "warning",
  received: "success",
  cancelled: "critical",
};

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: po, error: poError } = await getPurchaseOrder(id);
  if (poError) {
    return (
      <div className="space-y-6">
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{poError}</p>
      </div>
    );
  }
  if (!po) notFound();

  const canSend = po.status === "draft";
  const canConfirm = po.status === "sent";
  const canReceive = ["sent", "confirmed", "partially_received"].includes(po.status);
  const canCancel = ["draft", "sent", "confirmed"].includes(po.status);
  const canDownloadGrn = ["partially_received", "received"].includes(po.status);
  const canGenerateBill = ["partially_received", "received"].includes(po.status);
  const canEdit = ["draft", "sent", "confirmed"].includes(po.status);
  const canResend = po.revision > 0 && po.status !== "cancelled";
  const existingBill = canGenerateBill ? await getSupplierBillByPoId(po.id) : null;
  // Corrections rewrite quantity_received directly, so they're locked out once
  // a bill has been raised off those totals — bill amounts are never manually
  // editable, so a correction afterward would silently desync the two.
  const canCorrectReceipt = ["partially_received", "received"].includes(po.status) && !existingBill;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{po.po_number}</h1>
          <p className="text-sm text-muted-foreground">
            {po.supplier ? (
              <Link href={`/suppliers/${po.supplier.id}`} className="text-primary hover:underline">
                {po.supplier.name}
              </Link>
            ) : (
              "No supplier"
            )}
            {" · "}Ordered {po.order_date}
            {po.expected_date && <> · Expected {po.expected_date}</>}
          </p>
        </div>
        <div className="text-right">
          <Badge tone={statusTone[po.status] ?? "neutral"}>{po.status.replace(/_/g, " ")}</Badge>
          {po.revision > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Rev. {po.revision}{po.corrected_at && ` · corrected ${new Date(po.corrected_at).toLocaleDateString()}`}
            </p>
          )}
        </div>
      </div>

      {po.status !== "cancelled" && (
        <SupplierInvoiceNumberForm
          action={updatePurchaseOrderSupplierInvoiceNumber}
          idField="po_id"
          idValue={po.id}
          initialValue={po.supplier_invoice_number}
        />
      )}

      <PdfPreview src={`/api/purchase-orders/${po.id}/pdf`} title={`${po.po_number}.pdf`} />

      {po.notes && (
        <Card>
          <CardContent className="text-sm text-muted-foreground">{po.notes}</CardContent>
        </Card>
      )}

      {po.status === "cancelled" && po.cancelled_reason && (
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">
          Cancelled: {po.cancelled_reason}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {canEdit && (
          <Link href={`/purchase-orders/${po.id}/edit`}>
            <Button variant="outline">
              <Pencil size={16} /> Edit
            </Button>
          </Link>
        )}
        {canSend && <SendPoButton poId={po.id} />}
        {canConfirm && <ConfirmPoButton poId={po.id} />}
        {canResend && <ResendPoButton poId={po.id} />}
        {canCancel && <CancelPoButton poId={po.id} />}
        {po.status === "draft" && (
          <DeleteEntityButton id={po.id} action={deletePurchaseOrder} canDelete entityLabel="purchase order" />
        )}
        {canDownloadGrn && (
          <Link href={`/purchase-orders/${po.id}/grn`}>
            <Button variant="outline">
              <FileText size={16} /> Goods Received Note
            </Button>
          </Link>
        )}
        {canGenerateBill && (
          existingBill ? (
            <Link href={`/supplier-bills/${existingBill.id}`}>
              <Button variant="outline">View Supplier Bill</Button>
            </Link>
          ) : (
            <GenerateSupplierBillButton poId={po.id} />
          )
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Commodity</th>
                <th className="px-4 py-2 font-medium">Ordered</th>
                <th className="px-4 py-2 font-medium">Received</th>
                <th className="px-4 py-2 font-medium">Unit cost</th>
                {canReceive && <th className="px-4 py-2 font-medium">Receive</th>}
                {canCorrectReceipt && <th className="px-4 py-2 font-medium">Correct</th>}
              </tr>
            </thead>
            <tbody>
              {po.lines.map((line) => {
                const outstanding = line.quantity_ordered - line.quantity_received;
                return (
                  <tr key={line.id} className="border-t border-border align-top">
                    <td className="px-4 py-2">
                      <span className="font-medium text-foreground">{line.item?.name ?? "Unknown item"}</span>{" "}
                      <span className="text-muted-foreground">({line.item?.code})</span>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {line.quantity_ordered} {line.item?.unit_of_measure}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {line.quantity_received} {line.item?.unit_of_measure}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {line.unit_cost !== null ? `KES ${line.unit_cost}` : "-"}
                    </td>
                    {canReceive && (
                      <td className="px-4 py-2">
                        <ReceivePoLineForm
                          poId={po.id}
                          lineId={line.id}
                          unitOfMeasure={line.item?.unit_of_measure ?? "unit"}
                          outstanding={outstanding}
                        />
                      </td>
                    )}
                    {canCorrectReceipt && (
                      <td className="px-4 py-2">
                        {line.quantity_received > 0 ? (
                          <CorrectPoLineReceiptForm
                            poId={po.id}
                            lineId={line.id}
                            unitOfMeasure={line.item?.unit_of_measure ?? "unit"}
                            quantityReceived={line.quantity_received}
                            unitCost={line.unit_cost}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {["partially_received", "received"].includes(po.status) && existingBill && (
        <p className="text-xs text-muted-foreground">
          Received quantities are locked while a supplier bill exists for this PO — cancel the bill first to correct
          them.
        </p>
      )}
    </div>
  );
}
