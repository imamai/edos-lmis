import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CollectSpecimensButton } from "@/components/collect-specimens-button";
import { GenerateInvoiceButton } from "@/components/generate-invoice-button";
import { CancelOrderButton } from "@/components/cancel-order-button";
import { RecollectionButton } from "@/components/recollection-button";
import { EditOrderDetailsForm } from "@/components/edit-order-details-form";
import Link from "next/link";
import { notFound } from "next/navigation";

const otStatusTone: Record<string, "neutral" | "warning" | "info" | "success" | "critical"> = {
  pending: "warning",
  specimen_collected: "info",
  received: "info",
  in_analysis: "info",
  resulted: "info",
  verified: "success",
  released: "success",
  cancelled: "critical",
  rejected: "critical",
  accessioned: "info",
  partially_completed: "info",
  completed: "success",
};

const CANCELLABLE_ORDER_TEST_STATUSES = new Set(["pending", "specimen_collected", "received", "in_analysis"]);

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order, error: orderError } = await supabase
    .from("edoslmis_orders")
    .select("*, edoslmis_patients(id, first_name, last_name, patient_number)")
    .eq("id", id)
    .single();

  if (orderError) {
    return (
      <div className="space-y-6">
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{orderError.message}</p>
      </div>
    );
  }
  if (!order) notFound();

  const patient = order.edoslmis_patients as unknown as {
    id: string;
    first_name: string;
    last_name: string;
    patient_number: string;
  };

  const { data: orderTests } = await supabase
    .from("edoslmis_order_tests")
    .select("id, status, price, specimen_id, edoslmis_tests(name, code)")
    .eq("order_id", id);

  const { data: specimens } = await supabase
    .from("edoslmis_specimens")
    .select("id, specimen_number, status")
    .eq("order_id", id);

  const { data: existingInvoice } = await supabase
    .from("edoslmis_invoices")
    .select("id")
    .eq("order_id", id)
    .neq("status", "cancelled")
    .maybeSingle();

  const hasPending = orderTests?.some((ot) => ot.status === "pending");
  const hasReleasedTest = orderTests?.some((ot) => ot.status === "released");
  const canCancel =
    order.status !== "cancelled" &&
    !(orderTests ?? []).some(
      (ot) => !CANCELLABLE_ORDER_TEST_STATUSES.has(ot.status) && ot.status !== "cancelled" && ot.status !== "rejected"
    );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{order.order_number}</h1>
          <p className="text-sm text-muted-foreground">
            <Link href={`/patients/${patient.id}`} className="text-primary hover:underline">
              {patient.first_name} {patient.last_name} ({patient.patient_number})
            </Link>
          </p>
        </div>
        <Badge tone={otStatusTone[order.status] ?? "neutral"}>{order.status}</Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {hasPending && <CollectSpecimensButton orderId={id} />}
        {hasReleasedTest && (
          <Link href={`/orders/${id}/report`} className="text-sm text-primary hover:underline">
            View Report
          </Link>
        )}
        {existingInvoice ? (
          <Link href={`/billing/${existingInvoice.id}`} className="text-sm text-primary hover:underline">
            View Invoice
          </Link>
        ) : (
          <GenerateInvoiceButton orderId={id} />
        )}
        {canCancel && <CancelOrderButton orderId={id} />}
      </div>

      {order.status === "pending" && <EditOrderDetailsForm order={order} />}

      <Card>
        <CardHeader>
          <CardTitle>Requested Tests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Test</th>
                <th className="px-4 py-2 font-medium">Price</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {orderTests?.map((ot) => {
                const test = ot.edoslmis_tests as unknown as { name: string; code: string } | null;
                return (
                  <tr key={ot.id} className="border-t border-border">
                    <td className="px-4 py-2 text-foreground">{test?.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">KES {ot.price}</td>
                    <td className="px-4 py-2">
                      <Badge tone={otStatusTone[ot.status] ?? "neutral"}>{ot.status}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      {["received", "in_analysis"].includes(ot.status) && (
                        <Link href={`/results/${ot.id}`} className="text-primary hover:underline">
                          Enter Result
                        </Link>
                      )}
                      {["resulted", "verified"].includes(ot.status) && (
                        <Link href={`/results/${ot.id}`} className="text-primary hover:underline">
                          Verify
                        </Link>
                      )}
                      {ot.status === "released" && (
                        <Link href={`/results/${ot.id}`} className="text-primary hover:underline">
                          Details
                        </Link>
                      )}
                      {ot.status === "rejected" && <RecollectionButton orderTestId={ot.id} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {(specimens?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Specimens</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {specimens?.map((s) => (
              <Link
                key={s.id}
                href={`/specimens/${s.id}/label`}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-muted"
              >
                <span className="font-medium text-foreground">{s.specimen_number}</span>
                <Badge tone="neutral">{s.status}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
