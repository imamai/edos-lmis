"use client";

import { useActionState, useState } from "react";
import { createInventoryItem } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type CategoryOption = { value: string; label: string };

const CATEGORY_CODE_PREFIX: Record<string, string> = {
  reagent: "RGT",
  consumable: "CON",
  glassware: "GLS",
  chemical: "CHM",
  kit: "KIT",
  calibrator: "CAL",
  control: "CTL",
  other: "OTH",
};

// Code column is varchar(30) — leave room for "<prefix>-" before truncating the slug.
function suggestCode(name: string, category: string): string {
  const prefix = CATEGORY_CODE_PREFIX[category] ?? "ITM";
  const slug = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30 - prefix.length - 1);
  return slug ? `${prefix}-${slug}` : prefix;
}

export function NewInventoryItemForm({
  departments,
  categories,
}: {
  departments: { id: string; name: string }[];
  categories: CategoryOption[];
}) {
  const [state, formAction, pending] = useActionState(createInventoryItem, null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0]?.value ?? "");
  const [code, setCode] = useState("");
  const [codeEdited, setCodeEdited] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!codeEdited) setCode(suggestCode(value, category));
  }

  function handleCategoryChange(value: string) {
    setCategory(value);
    if (!codeEdited) setCode(suggestCode(name, value));
  }

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="code">Code *</Label>
            <Input
              id="code"
              name="code"
              required
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setCodeEdited(true);
              }}
              placeholder="Auto-generated from name — edit if needed"
            />
          </div>
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" required value={name} onChange={(e) => handleNameChange(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select id="category" name="category" value={category} onChange={(e) => handleCategoryChange(e.target.value)}>
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
          <div className="sm:col-span-2">
            <Label htmlFor="tracking_mode">Tracking mode</Label>
            <Select id="tracking_mode" name="tracking_mode" defaultValue="order_driven">
              <option value="order_driven">Order-driven — deducted automatically from Orders → Results</option>
              <option value="manual_entry">Manual entry — deducted via Record Stock Movement (Manual usage)</option>
            </Select>
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
