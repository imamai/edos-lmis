"use client";

import { useActionState, useState } from "react";
import { cancelInvoice } from "@/lib/actions/billing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CancelInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [state, formAction, pending] = useActionState(cancelInvoice, null);
  const [show, setShow] = useState(false);

  if (!show) {
    return (
      <Button variant="outline" onClick={() => setShow(true)}>
        Cancel Invoice
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="invoice_id" value={invoiceId} />
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
