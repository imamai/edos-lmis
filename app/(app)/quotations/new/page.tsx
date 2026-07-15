import { QuotationForm } from "@/components/quotation-form";

export default function NewQuotationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">New Quotation</h1>
        <p className="text-sm text-muted-foreground">Prepare a price quotation for a customer</p>
      </div>
      <QuotationForm />
    </div>
  );
}
