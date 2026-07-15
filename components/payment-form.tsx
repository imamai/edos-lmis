"use client";

import { useActionState } from "react";
import { recordPayment } from "@/lib/actions/billing";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

type PaymentMethodOption = { value: string; label: string };

export function PaymentForm({
  invoiceId,
  balanceDue,
  methods,
}: {
  invoiceId: string;
  balanceDue: number;
  methods: PaymentMethodOption[];
}) {
  const [state, formAction, pending] = useActionState(recordPayment, null);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end lg:grid-cols-4">
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <div>
        <Label htmlFor="amount">Amount (KES)</Label>
        <Input id="amount" name="amount" type="number" step="0.01" max={balanceDue} defaultValue={balanceDue} required />
      </div>
      <div className="min-w-[10rem]">
        <Label htmlFor="payment_method">Method</Label>
        <Select id="payment_method" name="payment_method" defaultValue={methods[0]?.value ?? "cash"} className="min-w-[10rem]">
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
      {state?.error && <p className="sm:col-span-2 lg:col-span-4 text-sm text-critical">{state.error}</p>}
    </form>
  );
}
