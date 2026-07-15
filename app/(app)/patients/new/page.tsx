"use client";

import { useActionState } from "react";
import { createPatient } from "@/lib/actions/patients";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewPatientPage() {
  const [state, formAction, pending] = useActionState(createPatient, null);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Register Patient</h1>
        <p className="text-sm text-muted-foreground">Capture demographic and contact details</p>
      </div>

      <form action={formAction}>
        <Card>
          <CardHeader>
            <CardTitle>Demographics</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="first_name">First name *</Label>
              <Input id="first_name" name="first_name" required />
            </div>
            <div>
              <Label htmlFor="last_name">Last name *</Label>
              <Input id="last_name" name="last_name" required />
            </div>
            <div>
              <Label htmlFor="other_names">Other names</Label>
              <Input id="other_names" name="other_names" />
            </div>
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select id="gender" name="gender" defaultValue="">
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="unknown">Unknown</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="date_of_birth">Date of birth</Label>
              <Input id="date_of_birth" name="date_of_birth" type="date" />
            </div>
            <div>
              <Label htmlFor="national_id">National ID</Label>
              <Input id="national_id" name="national_id" />
            </div>
            <div>
              <Label htmlFor="phone_primary">Phone number</Label>
              <Input id="phone_primary" name="phone_primary" placeholder="07xx xxx xxx" />
            </div>
            <div>
              <Label htmlFor="county">County</Label>
              <Input id="county" name="county" />
            </div>
            <div>
              <Label htmlFor="patient_category">Patient category</Label>
              <Select id="patient_category" name="patient_category" defaultValue="walk_in">
                <option value="walk_in">Walk-in</option>
                <option value="inpatient">Inpatient</option>
                <option value="outpatient">Outpatient</option>
                <option value="corporate">Corporate</option>
                <option value="insurance">Insurance</option>
                <option value="referral">Referral</option>
                <option value="research">Research</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Next of Kin</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="next_of_kin_name">Name</Label>
              <Input id="next_of_kin_name" name="next_of_kin_name" />
            </div>
            <div>
              <Label htmlFor="next_of_kin_phone">Phone</Label>
              <Input id="next_of_kin_phone" name="next_of_kin_phone" />
            </div>
          </CardContent>
        </Card>

        {state?.error && (
          <p className="mt-4 rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">
            {state.error}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : "Register Patient"}
          </Button>
        </div>
      </form>
    </div>
  );
}
