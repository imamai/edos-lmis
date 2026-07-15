"use client";

import { useActionState } from "react";
import { createTest } from "@/lib/actions/catalog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type Option = { id: string; name: string };

export function NewTestForm({
  departments,
  categories,
  specimenTypes,
}: {
  departments: Option[];
  categories: Option[];
  specimenTypes: (Option & { code: string })[];
}) {
  const [state, formAction, pending] = useActionState(createTest, null);

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="code">Code *</Label>
            <Input id="code" name="code" required placeholder="FBC" />
          </div>
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" required placeholder="Full Blood Count" />
          </div>
          <div>
            <Label htmlFor="short_name">Short name</Label>
            <Input id="short_name" name="short_name" />
          </div>
          <div>
            <Label htmlFor="price">Price</Label>
            <Input id="price" name="price" type="number" step="0.01" min="0" defaultValue="0" />
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
            <Label htmlFor="category_id">Category</Label>
            <Select id="category_id" name="category_id" defaultValue="">
              <option value="">Unassigned</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="specimen_type_id">Specimen type</Label>
            <Select id="specimen_type_id" name="specimen_type_id" defaultValue="">
              <option value="">Unspecified</option>
              {specimenTypes.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="turnaround_time_hours">Turnaround time (hours)</Label>
            <Input id="turnaround_time_hours" name="turnaround_time_hours" type="number" min="0" />
          </div>
          <div>
            <Label htmlFor="gender_applicability">Gender applicability</Label>
            <Select id="gender_applicability" name="gender_applicability" defaultValue="all">
              <option value="all">All</option>
              <option value="male">Male only</option>
              <option value="female">Female only</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      {state?.error && (
        <p className="mt-4 rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{state.error}</p>
      )}

      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Create Test"}
        </Button>
      </div>
    </form>
  );
}
