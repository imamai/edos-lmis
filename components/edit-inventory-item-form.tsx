"use client";

import { useActionState } from "react";
import { updateInventoryItem } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type ItemRecord = {
  id: string;
  code: string;
  name: string;
  category: string;
  unit_of_measure: string;
  reorder_level: number;
  department_id: string | null;
  tracking_mode: string;
};

type CategoryOption = { value: string; label: string };

export function EditInventoryItemForm({
  item,
  departments,
  categories,
}: {
  item: ItemRecord;
  departments: { id: string; name: string }[];
  categories: CategoryOption[];
}) {
  const [state, formAction, pending] = useActionState(updateInventoryItem, null);
  const categoryOptions = categories.some((c) => c.value === item.category)
    ? categories
    : [...categories, { value: item.category, label: item.category }];

  return (
    <form action={formAction}>
      <input type="hidden" name="item_id" value={item.id} />
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="code">Code *</Label>
            <Input id="code" name="code" required defaultValue={item.code} />
          </div>
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" required defaultValue={item.name} />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select id="category" name="category" defaultValue={item.category}>
              {categoryOptions.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="department_id">Department</Label>
            <Select id="department_id" name="department_id" defaultValue={item.department_id ?? ""}>
              <option value="">Unassigned</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="unit_of_measure">Unit of measure</Label>
            <Input id="unit_of_measure" name="unit_of_measure" defaultValue={item.unit_of_measure} />
          </div>
          <div>
            <Label htmlFor="reorder_level">Reorder level</Label>
            <Input id="reorder_level" name="reorder_level" type="number" step="0.01" defaultValue={item.reorder_level} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="tracking_mode">Tracking mode</Label>
            <Select id="tracking_mode" name="tracking_mode" defaultValue={item.tracking_mode}>
              <option value="order_driven">Order-driven — deducted automatically from Orders → Results</option>
              <option value="manual_entry">Manual entry — deducted via Record Stock Movement (Manual usage)</option>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Switching modes only changes how future usage is deducted — it never rewrites past stock movements.
              A commodity can only be deducted through one path at a time.
            </p>
          </div>
        </CardContent>
      </Card>

      {state?.error && (
        <p className="mt-4 rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{state.error}</p>
      )}

      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
