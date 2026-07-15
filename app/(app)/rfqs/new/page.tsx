import { getSuppliers, getProcurableItems } from "@/lib/data/procurement";
import { RfqForm } from "@/components/rfq-form";

export default async function NewRfqPage() {
  const [{ data: suppliers }, items] = await Promise.all([getSuppliers(), getProcurableItems()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">New Request for Quotation</h1>
        <p className="text-sm text-muted-foreground">Ask one or more suppliers to quote before ordering</p>
      </div>
      <RfqForm suppliers={suppliers.filter((s) => s.is_active)} items={items} />
    </div>
  );
}
