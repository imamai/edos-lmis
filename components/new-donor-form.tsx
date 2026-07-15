"use client";

import { useActionState } from "react";
import { createDonor } from "@/lib/actions/bloodbank";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { BLOOD_GROUP_LABELS, DONOR_TYPE_LABELS } from "@/lib/blood-compatibility";

export function NewDonorForm() {
  const [state, formAction, pending] = useActionState(createDonor, null);

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="first_name">First Name *</Label>
            <Input id="first_name" name="first_name" required />
          </div>
          <div>
            <Label htmlFor="last_name">Last Name *</Label>
            <Input id="last_name" name="last_name" required />
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select id="gender" name="gender" defaultValue="">
              <option value="">Unspecified</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="date_of_birth">Date of Birth</Label>
            <Input id="date_of_birth" name="date_of_birth" type="date" />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" />
          </div>
          <div>
            <Label htmlFor="national_id">National ID</Label>
            <Input id="national_id" name="national_id" />
          </div>
          <div>
            <Label htmlFor="donor_type">Donor Type</Label>
            <Select id="donor_type" name="donor_type" defaultValue="voluntary">
              {Object.entries(DONOR_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="blood_group">Blood Group</Label>
            <Select id="blood_group" name="blood_group" defaultValue="">
              <option value="">Unknown</option>
              {Object.entries(BLOOD_GROUP_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {state?.error && (
        <p className="mt-4 rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{state.error}</p>
      )}

      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Register Donor"}
        </Button>
      </div>
    </form>
  );
}
