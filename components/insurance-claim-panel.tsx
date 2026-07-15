"use client";

import { useActionState } from "react";
import { submitClaim, updateClaimStatus } from "@/lib/actions/billing";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

type Claim = {
  id: string;
  scheme_name: string;
  policy_number: string | null;
  claim_number: string | null;
  status: string;
  approved_amount: number | null;
  rejection_reason: string | null;
};

export function NewClaimForm({ invoiceId }: { invoiceId: string }) {
  const [state, formAction, pending] = useActionState(submitClaim, null);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <div>
        <Label htmlFor="scheme_name">Scheme (NHIF/SHA/Insurer)</Label>
        <Input id="scheme_name" name="scheme_name" required />
      </div>
      <div>
        <Label htmlFor="policy_number">Policy Number</Label>
        <Input id="policy_number" name="policy_number" />
      </div>
      <div>
        <Label htmlFor="claim_number">Claim Number</Label>
        <Input id="claim_number" name="claim_number" />
      </div>
      <div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Submitting..." : "Submit Claim"}
        </Button>
      </div>
      {state?.error && <p className="sm:col-span-4 text-sm text-critical">{state.error}</p>}
    </form>
  );
}

export function ClaimStatusForm({ claim, invoiceId }: { claim: Claim; invoiceId: string }) {
  const [state, formAction, pending] = useActionState(updateClaimStatus, null);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
      <input type="hidden" name="claim_id" value={claim.id} />
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <div>
        <Label htmlFor={`status-${claim.id}`}>Status</Label>
        <Select id={`status-${claim.id}`} name="status" defaultValue={claim.status}>
          <option value="pending">Pending</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="paid">Paid</option>
        </Select>
      </div>
      <div>
        <Label htmlFor={`approved-${claim.id}`}>Approved Amount</Label>
        <Input id={`approved-${claim.id}`} name="approved_amount" type="number" step="0.01" defaultValue={claim.approved_amount ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor={`reason-${claim.id}`}>Rejection Reason</Label>
        <Input id={`reason-${claim.id}`} name="rejection_reason" defaultValue={claim.rejection_reason ?? ""} />
      </div>
      <div className="sm:col-span-4">
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? "Updating..." : "Update Claim"}
        </Button>
      </div>
      {state?.error && <p className="sm:col-span-4 text-sm text-critical">{state.error}</p>}
    </form>
  );
}
