"use client";

import { useActionState } from "react";
import { createBloodUnit } from "@/lib/actions/bloodbank";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { BLOOD_GROUP_LABELS, BLOOD_COMPONENT_LABELS } from "@/lib/blood-compatibility";

type Donor = { id: string; first_name: string; last_name: string; donor_number: string; blood_group: string | null };

export function NewBloodUnitForm({ donors }: { donors: Donor[] }) {
  const [state, formAction, pending] = useActionState(createBloodUnit, null);

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="donor_id">Donor</Label>
            <Select id="donor_id" name="donor_id" defaultValue="">
              <option value="">Unknown / not tracked</option>
              {donors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.first_name} {d.last_name} ({d.donor_number})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="blood_group">Blood Group *</Label>
            <Select id="blood_group" name="blood_group" required defaultValue="">
              <option value="" disabled>Select</option>
              {Object.entries(BLOOD_GROUP_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="component">Component</Label>
            <Select id="component" name="component" defaultValue="whole_blood">
              {Object.entries(BLOOD_COMPONENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="volume_ml">Volume (mL)</Label>
            <Input id="volume_ml" name="volume_ml" type="number" defaultValue="450" />
          </div>
          <div>
            <Label htmlFor="collection_date">Collection Date</Label>
            <Input id="collection_date" name="collection_date" type="date" />
          </div>
          <div>
            <Label htmlFor="expiry_date">Expiry Date *</Label>
            <Input id="expiry_date" name="expiry_date" type="date" required />
          </div>
        </CardContent>
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        New units enter quarantine until infectious disease screening (HIV/HBsAg/HCV/Syphilis) is recorded.
      </p>

      {state?.error && (
        <p className="mt-2 rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{state.error}</p>
      )}

      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Add Blood Unit"}
        </Button>
      </div>
    </form>
  );
}
