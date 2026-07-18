"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateStockTransaction, deleteStockTransaction } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2 } from "lucide-react";

const typeTone: Record<string, "neutral" | "success" | "critical" | "warning" | "info"> = {
  opening_balance: "neutral",
  positive_adjustment: "success",
  negative_adjustment: "warning",
  wastage: "critical",
  expiry: "critical",
  stock_count_correction: "neutral",
  manual_usage: "warning",
};

const typeOptions = [
  { value: "positive_adjustment", label: "Positive adjustment" },
  { value: "negative_adjustment", label: "Negative adjustment" },
  { value: "wastage", label: "Wastage" },
  { value: "expiry", label: "Expiry" },
  { value: "stock_count_correction", label: "Stock count correction" },
  { value: "opening_balance", label: "Opening balance" },
  { value: "manual_usage", label: "Manual usage (tests done)" },
];

export function EditableStockRow({
  id,
  itemId,
  transactionType,
  quantityChange,
  balanceAfter,
  notes,
  performedAt,
}: {
  id: string;
  itemId: string;
  transactionType: string;
  quantityChange: number;
  balanceAfter: number;
  notes: string | null;
  performedAt: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [state, formAction, pending] = useActionState(updateStockTransaction, null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (mode === "edit") {
    return (
      <tr className="border-t border-border bg-surface-muted">
        <td className="px-4 py-2 align-top text-muted-foreground">{new Date(performedAt).toLocaleString()}</td>
        <td colSpan={4} className="px-4 py-2 align-top">
          <form action={formAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="transaction_id" value={id} />
            <input type="hidden" name="item_id" value={itemId} />
            <Select name="transaction_type" defaultValue={transactionType} className="h-9 w-48">
              {typeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Input
              name="quantity"
              type="number"
              step="0.01"
              defaultValue={Math.abs(quantityChange)}
              className="h-9 w-28"
              required
            />
            <Input name="notes" defaultValue={notes ?? ""} placeholder="Notes" className="h-9 w-48" />
            <Button type="submit" disabled={pending} className="h-9">
              {pending ? "Saving..." : "Save"}
            </Button>
            <Button type="button" variant="ghost" className="h-9" onClick={() => setMode("view")}>
              Cancel
            </Button>
            {state?.error && <span className="w-full text-xs text-critical">{state.error}</span>}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-border">
      <td className="px-4 py-2 text-muted-foreground">{new Date(performedAt).toLocaleString()}</td>
      <td className="px-4 py-2">
        <Badge tone={typeTone[transactionType] ?? "neutral"}>{transactionType.replace(/_/g, " ")}</Badge>
      </td>
      <td className={`px-4 py-2 font-medium ${quantityChange < 0 ? "text-critical" : "text-success"}`}>
        {quantityChange > 0 ? "+" : ""}
        {quantityChange}
      </td>
      <td className="px-4 py-2 font-medium text-foreground">{balanceAfter}</td>
      <td className="px-4 py-2 text-muted-foreground">
        <div className="flex items-center justify-between gap-2">
          <span>{notes ?? "-"}</span>
          {!confirmingDelete ? (
            <span className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setMode("edit")}
                title="Edit"
                className="rounded p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                title="Delete"
                className="rounded p-1 text-muted-foreground hover:bg-critical/10 hover:text-critical"
              >
                <Trash2 size={14} />
              </button>
            </span>
          ) : (
            <span className="flex shrink-0 items-center gap-2 text-xs">
              <span>Delete?</span>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() =>
                  startDelete(async () => {
                    const result = await deleteStockTransaction(id, itemId);
                    if (result?.error) {
                      setDeleteError(result.error);
                      setConfirmingDelete(false);
                    } else {
                      router.refresh();
                    }
                  })
                }
                className="font-medium text-critical hover:underline"
              >
                {isDeleting ? "Deleting..." : "Confirm"}
              </button>
              <button type="button" onClick={() => setConfirmingDelete(false)} className="text-muted-foreground hover:underline">
                Cancel
              </button>
            </span>
          )}
        </div>
        {deleteError && <p className="mt-1 text-xs text-critical">{deleteError}</p>}
      </td>
    </tr>
  );
}
