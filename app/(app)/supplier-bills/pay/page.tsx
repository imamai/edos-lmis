import { getSuppliers } from "@/lib/data/procurement";
import { getOutstandingSupplierBills } from "@/lib/data/supplier-bills";
import { getSettingsList } from "@/lib/data/settings-lists";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BulkSupplierPaymentPicker } from "@/components/bulk-supplier-payment-picker";

export default async function PaySupplierBillsPage({
  searchParams,
}: {
  searchParams: Promise<{ supplier?: string }>;
}) {
  const { supplier: supplierId } = await searchParams;
  const [{ data: suppliers }, paymentMethods] = await Promise.all([getSuppliers(), getSettingsList("payment_method")]);

  const bills = supplierId ? await getOutstandingSupplierBills(supplierId) : [];
  const selectedSupplier = suppliers.find((s) => s.id === supplierId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Pay Supplier Bills</h1>
        <p className="text-sm text-muted-foreground">
          Pick a supplier, select the bills to settle, and pay them all in one action instead of one at a time.
        </p>
      </div>

      <Card>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3">
            <div className="w-64">
              <Label htmlFor="supplier">Supplier</Label>
              <Select id="supplier" name="supplier" defaultValue={supplierId ?? ""}>
                <option value="" disabled>
                  Select a supplier
                </option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="submit" variant="secondary">
              Show Outstanding Bills
            </Button>
          </form>
        </CardContent>
      </Card>

      {selectedSupplier && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedSupplier.name} — outstanding bills</CardTitle>
          </CardHeader>
          <CardContent>
            {bills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No outstanding bills for this supplier.</p>
            ) : (
              <BulkSupplierPaymentPicker bills={bills} paymentMethods={paymentMethods} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
