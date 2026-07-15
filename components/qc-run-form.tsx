"use client";

import { useActionState } from "react";
import { logQcRun } from "@/lib/actions/qc";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

export function QcRunForm({
  materialId,
  equipment,
}: {
  materialId: string;
  equipment: { id: string; name: string; code: string }[];
}) {
  const [state, formAction, pending] = useActionState(logQcRun, null);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-5 sm:items-end">
      <input type="hidden" name="material_id" value={materialId} />
      <div>
        <Label htmlFor="value">Control Value</Label>
        <Input id="value" name="value" type="number" step="0.0001" required />
      </div>
      <div>
        <Label htmlFor="equipment_id">Instrument</Label>
        <Select id="equipment_id" name="equipment_id" defaultValue="">
          <option value="">Not specified</option>
          {equipment.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.code})
            </option>
          ))}
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="comments">Comments</Label>
        <Input id="comments" name="comments" />
      </div>
      <div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Logging..." : "Log QC Run"}
        </Button>
      </div>
      {state?.error && <p className="sm:col-span-5 text-sm text-critical">{state.error}</p>}
    </form>
  );
}
