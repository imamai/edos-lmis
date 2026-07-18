"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { recordBulkSupplierPayments } from "@/lib/actions/supplier-bills";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";

type Bill = {
  id: string;
  bill_number: string;
  bill_date: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
};

type PaymentMethodOption = { value: string; label: string };

export function BulkSupplierPaymentPicker({
  bills,
  paymentMethods,
}: {
  bills: Bill[];
  paymentMethods: PaymentMethodOption[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(recordBulkSupplierPayments, null);
  const router = useRouter();
  const submittedRef = useRef(false);

  useEffect(() => {
    if (pending) submittedRef.current = true;
  }, [pending]);

  useEffect(() => {
    if (!pending && submittedRef.current && !state?.error) {
      submittedRef.current = false;
      setOpen(false);
      setSelected(new Set());
      router.refresh();
    }
  }, [pending, state, router]);

  function toggle(billId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(billId)) next.delete(billId);
      else next.add(billId);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => (prev.size === bills.length ? new Set() : new Set(bills.map((b) => b.id))));
  }

  const selectedBills = bills.filter((b) => selected.has(b.id));
  const selectedFullTotal = selectedBills.reduce((sum, b) => sum + b.balance_due, 0);
  const amountToPay = (billId: string, balanceDue: number) => amounts[billId] ?? balanceDue;
  const paymentTotal = selectedBills.reduce((sum, b) => sum + amountToPay(b.id, b.balance_due), 0);

  function openDialog() {
    setAmounts(Object.fromEntries(selectedBills.map((b) => [b.id, b.balance_due])));
    setOpen(true);
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={bills.length > 0 && selected.size === bills.length}
                  onChange={toggleAll}
                  aria-label="Select all"
                />
              </th>
              <th className="px-3 py-2 font-medium">Bill</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Total</th>
              <th className="px-3 py-2 font-medium">Balance Due</th>
              <th className="px-3 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => (
              <tr key={bill.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(bill.id)}
                    onChange={() => toggle(bill.id)}
                    aria-label={`Select ${bill.bill_number}`}
                  />
                </td>
                <td className="px-3 py-2 font-medium text-foreground">{bill.bill_number}</td>
                <td className="px-3 py-2 text-muted-foreground">{bill.bill_date}</td>
                <td className="px-3 py-2 text-foreground">KES {bill.total_amount}</td>
                <td className="px-3 py-2 font-medium text-critical">KES {bill.balance_due}</td>
                <td className="px-3 py-2">
                  <Badge tone={bill.status === "partially_paid" ? "info" : "warning"}>
                    {bill.status.replace(/_/g, " ")}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" disabled={selected.size === 0} onClick={openDialog}>
          Pay Selected ({selected.size}) — KES {selectedFullTotal.toLocaleString()}
        </Button>
        {state?.error && !open && <p className="text-sm text-critical">{state.error}</p>}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title={`Pay ${selectedBills.length} bill${selectedBills.length === 1 ? "" : "s"}`}>
        <form action={formAction} className="space-y-4">
          {selectedBills.map((bill) => (
            <input key={bill.id} type="hidden" name="bill_id" value={bill.id} />
          ))}

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Bill</th>
                  <th className="px-3 py-2 font-medium">Balance Due</th>
                  <th className="px-3 py-2 font-medium">Amount to Pay</th>
                </tr>
              </thead>
              <tbody>
                {selectedBills.map((bill) => (
                  <tr key={bill.id} className="border-t border-border">
                    <td className="px-3 py-2 text-foreground">{bill.bill_number}</td>
                    <td className="px-3 py-2 text-muted-foreground">KES {bill.balance_due}</td>
                    <td className="px-3 py-2">
                      <Input
                        name={`amount__${bill.id}`}
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={bill.balance_due}
                        value={amountToPay(bill.id, bill.balance_due)}
                        onChange={(e) => setAmounts((prev) => ({ ...prev, [bill.id]: Number(e.target.value) || 0 }))}
                        className="w-28"
                        required
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-surface-muted">
                  <td className="px-3 py-2 font-medium text-foreground" colSpan={2}>
                    Total
                  </td>
                  <td className="px-3 py-2 font-medium text-foreground">KES {paymentTotal.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="payment_method">Method</Label>
              <Select id="payment_method" name="payment_method" defaultValue={paymentMethods[0]?.value ?? "cash"}>
                {paymentMethods.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="reference_number">Reference No.</Label>
              <Input id="reference_number" name="reference_number" placeholder="Applies to all selected bills" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" />
            </div>
          </div>

          {state?.error && <p className="text-sm text-critical">{state.error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Recording..." : `Confirm Payment — KES ${paymentTotal.toLocaleString()}`}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
