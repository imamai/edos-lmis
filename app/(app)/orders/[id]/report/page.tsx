import { createClient } from "@/lib/supabase/server";
import { PdfPreview } from "@/components/pdf-preview";
import { notFound } from "next/navigation";

export default async function OrderReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order, error: orderError } = await supabase
    .from("edoslmis_orders")
    .select("id, order_number, edoslmis_order_tests(status)")
    .eq("id", id)
    .single();

  if (orderError) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{orderError.message}</p>
      </div>
    );
  }
  if (!order) notFound();

  const orderTests = order.edoslmis_order_tests as unknown as { status: string }[] | null;
  const hasReleased = orderTests?.some((ot) => ot.status === "released");
  if (!hasReleased) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PdfPreview src={`/api/orders/${id}/report/pdf`} title={`${order.order_number} — Laboratory Report`} />
    </div>
  );
}
