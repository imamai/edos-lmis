"use client";

import { useActionState } from "react";
import { issueTransfusion } from "@/lib/actions/bloodbank";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function IssueTransfusionForm({
  crossmatchResultId,
  bloodUnitId,
  patientId,
  crossmatchRequestId,
}: {
  crossmatchResultId: string;
  bloodUnitId: string;
  patientId: string;
  crossmatchRequestId: string;
}) {
  const [state, formAction, pending] = useActionState(issueTransfusion, null);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="crossmatch_result_id" value={crossmatchResultId} />
      <input type="hidden" name="blood_unit_id" value={bloodUnitId} />
      <input type="hidden" name="patient_id" value={patientId} />
      <input type="hidden" name="crossmatch_request_id" value={crossmatchRequestId} />
      <div className="flex-1 min-w-[180px]">
        <Label htmlFor="ward_location">Ward / Location</Label>
        <Input id="ward_location" name="ward_location" placeholder="e.g. Ward 4B" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Issuing..." : "Issue for Transfusion"}
      </Button>
      {state?.error && <p className="w-full text-sm text-critical">{state.error}</p>}
    </form>
  );
}
