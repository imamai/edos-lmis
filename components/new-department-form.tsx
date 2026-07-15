"use client";

import { useActionState } from "react";
import { createDepartment } from "@/lib/actions/catalog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const DEPARTMENT_TYPES = [
  "clinical_chemistry", "haematology", "microbiology", "virology", "parasitology",
  "immunology", "histopathology", "cytology", "molecular_biology", "pcr", "blood_bank",
  "urinalysis", "toxicology", "serology", "tb_laboratory", "hiv_laboratory", "covid",
  "research", "other",
];

export function NewDepartmentForm() {
  const [state, formAction, pending] = useActionState(createDepartment, null);

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="code">Code *</Label>
            <Input id="code" name="code" required placeholder="HEMA" />
          </div>
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <Label htmlFor="department_type">Type</Label>
            <Select id="department_type" name="department_type" defaultValue="other">
              {DEPARTMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="default_tat_hours">Default TAT (hours)</Label>
            <Input id="default_tat_hours" name="default_tat_hours" type="number" min="0" />
          </div>
        </CardContent>
      </Card>

      {state?.error && (
        <p className="mt-4 rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{state.error}</p>
      )}

      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Create Department"}
        </Button>
      </div>
    </form>
  );
}
