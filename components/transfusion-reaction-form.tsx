"use client";

import { useActionState } from "react";
import { reportTransfusionReaction } from "@/lib/actions/bloodbank";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

export function TransfusionReactionForm({ transfusionId }: { transfusionId: string }) {
  const [state, formAction, pending] = useActionState(reportTransfusionReaction, null);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input type="hidden" name="transfusion_id" value={transfusionId} />
      <div>
        <Label htmlFor="reaction_type">Reaction Type</Label>
        <Input id="reaction_type" name="reaction_type" required placeholder="e.g. Febrile non-haemolytic" />
      </div>
      <div>
        <Label htmlFor="severity">Severity</Label>
        <Select id="severity" name="severity" defaultValue="mild">
          <option value="mild">Mild</option>
          <option value="moderate">Moderate</option>
          <option value="severe">Severe</option>
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="symptoms">Symptoms</Label>
        <Textarea id="symptoms" name="symptoms" rows={2} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="action_taken">Action Taken</Label>
        <Textarea id="action_taken" name="action_taken" rows={2} />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? "Reporting..." : "Report Reaction (stops transfusion)"}
        </Button>
      </div>
      {state?.error && <p className="sm:col-span-2 text-sm text-critical">{state.error}</p>}
    </form>
  );
}
