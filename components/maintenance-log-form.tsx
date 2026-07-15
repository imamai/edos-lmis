"use client";

import { useActionState } from "react";
import { logMaintenance } from "@/lib/actions/equipment";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";

export function MaintenanceLogForm({ equipmentId }: { equipmentId: string }) {
  const [state, formAction, pending] = useActionState(logMaintenance, null);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <input type="hidden" name="equipment_id" value={equipmentId} />
      <div>
        <Label htmlFor="maintenance_type">Type</Label>
        <Select id="maintenance_type" name="maintenance_type" defaultValue="preventive">
          <option value="preventive">Preventive</option>
          <option value="corrective">Corrective</option>
          <option value="calibration">Calibration</option>
          <option value="validation">Validation</option>
          <option value="installation">Installation</option>
        </Select>
      </div>
      <div>
        <Label htmlFor="vendor_name">Vendor</Label>
        <Input id="vendor_name" name="vendor_name" />
      </div>
      <div>
        <Label htmlFor="cost">Cost (KES)</Label>
        <Input id="cost" name="cost" type="number" step="0.01" />
      </div>
      <div>
        <Label htmlFor="downtime_hours">Downtime (hours)</Label>
        <Input id="downtime_hours" name="downtime_hours" type="number" step="0.1" defaultValue="0" />
      </div>
      <div>
        <Label htmlFor="next_due_date">Next Due Date</Label>
        <Input id="next_due_date" name="next_due_date" type="date" />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={1} />
      </div>
      <div className="sm:col-span-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Log Service Record"}
        </Button>
      </div>
      {state?.error && (
        <p className="sm:col-span-3 text-sm text-critical">{state.error}</p>
      )}
    </form>
  );
}
