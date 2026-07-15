"use client";

import { useActionState } from "react";
import { reportDowntime, resolveDowntime } from "@/lib/actions/equipment";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function ReportDowntimeForm({ equipmentId }: { equipmentId: string }) {
  const [state, formAction, pending] = useActionState(reportDowntime, null);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="equipment_id" value={equipmentId} />
      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="reason">Breakdown Reason</Label>
        <Input id="reason" name="reason" required placeholder="e.g. Power supply failure" />
      </div>
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? "Reporting..." : "Report Breakdown"}
      </Button>
      {state?.error && <p className="w-full text-sm text-critical">{state.error}</p>}
    </form>
  );
}

export function ResolveDowntimeButton({ downtimeId, equipmentId }: { downtimeId: string; equipmentId: string }) {
  const [state, formAction, pending] = useActionState(resolveDowntime, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="downtime_id" value={downtimeId} />
      <input type="hidden" name="equipment_id" value={equipmentId} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Resolving..." : "Mark Resolved"}
      </Button>
      {state?.error && <p className="text-xs text-critical">{state.error}</p>}
    </form>
  );
}
