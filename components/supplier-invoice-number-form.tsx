"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";

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
  // Locked read-only once a number is on file — it's what ties this record
  // back to the supplier's paperwork for search/tracking, so it shouldn't
  // be nudged by accident. Still reachable via the Correct toggle below.
  const [editing, setEditing] = useState(!initialValue);

  useEffect(() => {
    if (state && !state.error) setEditing(false);
  }, [state]);

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Supplier Invoice Number</span>
        <span className="font-medium text-foreground">{initialValue}</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
          <Pencil size={14} /> Correct
        </Button>
      </div>
    );
  }

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
          autoFocus={!!initialValue}
        />
      </div>
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
      {initialValue && (
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
          Cancel
        </Button>
      )}
      {state?.error && <span className="text-xs text-critical">{state.error}</span>}
    </form>
  );
}
