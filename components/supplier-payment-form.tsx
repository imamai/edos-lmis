"use client";

import { useActionState } from "react";
import { recordSupplierPayment } from "@/lib/actions/supplier-bills";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

type PaymentMethodOption = { value: string; label: string };

export function SupplierPaymentForm({
  billId,
  balanceDue,
  methods,
}: {
  billId: string;
  balanceDue: number;
  methods: PaymentMethodOption[];
}) {
  const [state, formAction, pending] = useActionState(recordSupplierPayment, null);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
      <input type="hidden" name="bill_id" value={billId} />
      <div>
        <Label htmlFor="amount">Amount (KES)</Label>
        <Input id="amount" name="amount" type="number" step="0.01" max={balanceDue} defaultValue={balanceDue} required />
      </div>
      <div>
        <Label htmlFor="payment_method">Method</Label>
        <Select id="payment_method" name="payment_method" defaultValue={methods[0]?.value ?? "cash"}>
          {methods.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="reference_number">Reference No.</Label>
        <Input id="reference_number" name="reference_number" />
      </div>
      <div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Recording..." : "Record Payment"}
        </Button>
      </div>
      {state?.error && <p className="sm:col-span-4 text-sm text-critical">{state.error}</p>}
    </form>
  );
}
