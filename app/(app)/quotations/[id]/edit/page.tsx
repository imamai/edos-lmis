import { getQuotation } from "@/lib/data/quotations";
import { QuotationForm } from "@/components/quotation-form";
import { notFound } from "next/navigation";

export default async function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
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
  if (!["draft", "sent"].includes(quotation.status)) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Edit Quotation</h1>
        <p className="text-sm text-muted-foreground">
          {quotation.quotation_number}
          {quotation.status === "draft"
            ? " · still in draft"
            : " · already sent — saving will mark this as a correction and you'll need to resend it"}
        </p>
      </div>
      <QuotationForm
        existingQuotation={{
          id: quotation.id,
          customer_name: quotation.customer_name,
          customer_email: quotation.customer_email,
          customer_phone: quotation.customer_phone,
          valid_until: quotation.valid_until,
          notes: quotation.notes,
          is_vat_exempt: quotation.is_vat_exempt,
          items: quotation.items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unit_of_measure: i.unit_of_measure,
            unit_price: i.unit_price,
          })),
        }}
      />
    </div>
  );
}
