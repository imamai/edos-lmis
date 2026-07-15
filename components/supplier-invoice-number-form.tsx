"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ActionFn = (
  prevState: { error: string | null } | null,
  formData: FormData
) => Promise<{ error: string | null }>;

export function SupplierInvoiceNumberForm({
  action,
  idField,
  idValue,
  initialValue,
}: {
  action: ActionFn;
  idField: string;
  idValue: string;
  initialValue: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name={idField} value={idValue} />
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Supplier Invoice Number</label>
        <Input
          name="supplier_invoice_number"
          defaultValue={initialValue ?? ""}
          placeholder="e.g. INV-4821"
          className="h-9 w-48"
        />
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
      {state?.error && <span className="text-xs text-critical">{state.error}</span>}
    </form>
  );
}
