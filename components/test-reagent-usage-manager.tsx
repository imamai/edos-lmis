"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addTestReagentUsage, removeTestReagentUsage } from "@/lib/actions/catalog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import type { TestReagentUsageRow } from "@/lib/data/catalog";
import type { ProcurableItem } from "@/lib/data/procurement";

export function TestReagentUsageManager({
  testId,
  usage,
  items,
}: {
  testId: string;
  usage: TestReagentUsageRow[];
  items: ProcurableItem[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(addTestReagentUsage, null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isRemoving, startRemove] = useTransition();
  const [removeError, setRemoveError] = useState<string | null>(null);

  const linkedItemIds = new Set(usage.map((u) => u.item_id));
  const availableItems = items.filter((i) => !linkedItemIds.has(i.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reagents / Consumables Used</CardTitle>
        <p className="text-sm text-muted-foreground">
          Inventory items auto-deducted from stock each time this test is resulted. Deleting this test removes
          these links but leaves the inventory items themselves untouched.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {usage.length === 0 && (
          <p className="text-sm text-muted-foreground">No reagents linked yet — this test won&apos;t deduct any stock on result entry.</p>
        )}
        {usage.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Qty per test</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {usage.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-3 py-2 text-foreground">
                    {u.item_name} <span className="text-muted-foreground">({u.item_code})</span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {u.quantity_per_test} {u.unit_of_measure}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      disabled={isRemoving && removingId === u.id}
                      title="Remove"
                      onClick={() =>
                        startRemove(async () => {
                          setRemovingId(u.id);
                          const result = await removeTestReagentUsage(u.id, testId);
                          if (result?.error) setRemoveError(result.error);
                          else router.refresh();
                        })
                      }
                      className="rounded p-1 text-muted-foreground hover:bg-critical/10 hover:text-critical"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {removeError && <p className="text-sm text-critical">{removeError}</p>}

        <form action={formAction} className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
          <input type="hidden" name="test_id" value={testId} />
          <div>
            <Label htmlFor="item_id">Item</Label>
            <Select id="item_id" name="item_id" className="h-9 w-56" defaultValue="" required>
              <option value="" disabled>
                {availableItems.length === 0 ? "No more items to link" : "Select an item"}
              </option>
              {availableItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.code})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="quantity_per_test">Qty per test</Label>
            <Input id="quantity_per_test" name="quantity_per_test" type="number" step="0.01" min="0.01" className="h-9 w-28" required />
          </div>
          <Button type="submit" size="sm" disabled={pending || availableItems.length === 0}>
            {pending ? "Adding..." : "Add Link"}
          </Button>
          {state?.error && <span className="w-full text-xs text-critical">{state.error}</span>}
        </form>
      </CardContent>
    </Card>
  );
}
