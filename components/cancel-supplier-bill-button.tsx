"use client";

import { useActionState, useState } from "react";
import { cancelSupplierBill } from "@/lib/actions/supplier-bills";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CancelSupplierBillButton({ billId }: { billId: string }) {
  const [state, formAction, pending] = useActionState(cancelSupplierBill, null);
  const [show, setShow] = useState(false);

  if (!show) {
    return (
      <Button variant="outline" onClick={() => setShow(true)}>
        Cancel Bill
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="bill_id" value={billId} />
      <Input name="reason" placeholder="Cancellation reason" className="h-9 w-52" required />
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? "Cancelling..." : "Confirm Cancel"}
      </Button>
      <Button type="button" variant="ghost" onClick={() => setShow(false)}>
        Back
      </Button>
      {state?.error && <span className="text-xs text-critical">{state.error}</span>}
    </form>
  );
}
