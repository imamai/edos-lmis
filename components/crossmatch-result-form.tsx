"use client";

import { useActionState } from "react";
import { recordCrossmatchResult } from "@/lib/actions/bloodbank";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { BLOOD_GROUP_LABELS } from "@/lib/blood-compatibility";

type Unit = { id: string; unit_number: string; blood_group: string; component: string; expiry_date: string };

export function CrossmatchResultForm({
  crossmatchRequestId,
  candidateUnits,
}: {
  crossmatchRequestId: string;
  candidateUnits: Unit[];
}) {
  const [state, formAction, pending] = useActionState(recordCrossmatchResult, null);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
      <input type="hidden" name="crossmatch_request_id" value={crossmatchRequestId} />
      <div className="sm:col-span-2">
        <Label htmlFor="blood_unit_id">Candidate Unit</Label>
        <Select id="blood_unit_id" name="blood_unit_id" required defaultValue="">
          <option value="" disabled>Select a unit</option>
          {candidateUnits.map((u) => (
            <option key={u.id} value={u.id}>
              {u.unit_number} &middot; {BLOOD_GROUP_LABELS[u.blood_group] ?? u.blood_group} &middot;{" "}
              {u.component.replace(/_/g, " ")} &middot; exp {u.expiry_date}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="method">Method</Label>
        <Select id="method" name="method" defaultValue="gel">
          <option value="gel">Gel Card</option>
          <option value="tube">Tube (AHG)</option>
          <option value="immediate_spin">Immediate Spin</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="result">Result</Label>
        <Select id="result" name="result" required defaultValue="">
          <option value="" disabled>Select</option>
          <option value="compatible">Compatible</option>
          <option value="incompatible">Incompatible</option>
        </Select>
      </div>
      <div className="sm:col-span-3">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" />
      </div>
      <div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Recording..." : "Record Result"}
        </Button>
      </div>
      {state?.error && <p className="sm:col-span-4 text-sm text-critical">{state.error}</p>}
    </form>
  );
}
