"use client";

import { useActionState } from "react";
import { createInventoryItem } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type CategoryOption = { value: string; label: string };

export function NewInventoryItemForm({
  departments,
  categories,
}: {
  departments: { id: string; name: string }[];
  categories: CategoryOption[];
}) {
  const [state, formAction, pending] = useActionState(createInventoryItem, null);

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="code">Code *</Label>
            <Input id="code" name="code" required />
          </div>
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select id="category" name="category" defaultValue={categories[0]?.value ?? ""}>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="department_id">Department</Label>
            <Select id="department_id" name="department_id" defaultValue="">
              <option value="">Unassigned</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="unit_of_measure">Unit of measure</Label>
            <Input id="unit_of_measure" name="unit_of_measure" defaultValue="unit" />
          </div>
          <div>
            <Label htmlFor="reorder_level">Reorder level</Label>
            <Input id="reorder_level" name="reorder_level" type="number" step="0.01" defaultValue="0" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="opening_quantity">Opening balance</Label>
            <Input id="opening_quantity" name="opening_quantity" type="number" step="0.01" defaultValue="0" />
          </div>
        </CardContent>
      </Card>

      {state?.error && (
        <p className="mt-4 rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{state.error}</p>
      )}

      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Create Commodity"}
        </Button>
      </div>
    </form>
  );
}
