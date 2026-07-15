"use client";

import { useActionState } from "react";
import { updateOrder } from "@/lib/actions/orders";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type OrderRecord = {
  id: string;
  ordering_clinician: string | null;
  priority: string;
  clinical_indication: string | null;
};

export function EditOrderDetailsForm({ order }: { order: OrderRecord }) {
  const [state, formAction, pending] = useActionState(updateOrder, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Order Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input type="hidden" name="order_id" value={order.id} />
          <div>
            <Label htmlFor="ordering_clinician">Ordering clinician</Label>
            <Input id="ordering_clinician" name="ordering_clinician" defaultValue={order.ordering_clinician ?? ""} />
          </div>
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select id="priority" name="priority" defaultValue={order.priority}>
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="stat">STAT</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="clinical_indication">Clinical indication</Label>
            <Textarea id="clinical_indication" name="clinical_indication" rows={2} defaultValue={order.clinical_indication ?? ""} />
          </div>
          {state?.error && (
            <p className="sm:col-span-2 rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{state.error}</p>
          )}
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
