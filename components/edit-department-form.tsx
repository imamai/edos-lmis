"use client";

import { useActionState } from "react";
import { updateDepartment } from "@/lib/actions/catalog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const DEPARTMENT_TYPES = [
  "clinical_chemistry", "haematology", "microbiology", "virology", "parasitology",
  "immunology", "histopathology", "cytology", "molecular_biology", "pcr", "blood_bank",
  "urinalysis", "toxicology", "serology", "tb_laboratory", "hiv_laboratory", "covid",
  "research", "other",
];

type DepartmentRecord = {
  id: string;
  code: string;
  name: string;
  department_type: string;
  default_tat_hours: number | null;
};

export function EditDepartmentForm({ department }: { department: DepartmentRecord }) {
  const [state, formAction, pending] = useActionState(updateDepartment, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="department_id" value={department.id} />
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="code">Code *</Label>
            <Input id="code" name="code" required defaultValue={department.code} />
          </div>
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" required defaultValue={department.name} />
          </div>
          <div>
            <Label htmlFor="department_type">Type</Label>
            <Select id="department_type" name="department_type" defaultValue={department.department_type}>
              {DEPARTMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="default_tat_hours">Default TAT (hours)</Label>
            <Input
              id="default_tat_hours"
              name="default_tat_hours"
              type="number"
              min="0"
              defaultValue={department.default_tat_hours ?? ""}
            />
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
