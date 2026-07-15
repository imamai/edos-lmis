import { getRfq, getSuppliers, getProcurableItems } from "@/lib/data/procurement";
import { RfqForm } from "@/components/rfq-form";
import { notFound } from "next/navigation";

export default async function EditRfqPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ data: rfq, error }, { data: suppliers }, items] = await Promise.all([
    getRfq(id),
    getSuppliers(),
    getProcurableItems(),
  ]);

  if (error) {
    return (
      <div className="space-y-6">
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{error}</p>
      </div>
    );
  }
  if (!rfq) notFound();
  if (!["draft", "sent"].includes(rfq.status)) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Edit RFQ</h1>
        <p className="text-sm text-muted-foreground">
          {rfq.rfq_number}
          {rfq.status === "draft"
            ? " · still in draft"
            : " · already sent — saving will mark this as a correction and you'll need to resend it"}
        </p>
      </div>
      <RfqForm
        suppliers={suppliers.filter((s) => s.is_active)}
        items={items}
        existingRfq={{
          id: rfq.id,
          expected_date: rfq.expected_date,
          notes: rfq.notes,
          lines: rfq.lines.map((l) => ({
            item_id: l.item?.id ?? "",
            quantity_requested: l.quantity_requested,
          })),
        }}
      />
    </div>
  );
}
