"use client";

import { useActionState, useState } from "react";
import { createCrossmatchRequest } from "@/lib/actions/bloodbank";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientPicker } from "@/components/patient-picker";
import { BLOOD_GROUP_LABELS, BLOOD_COMPONENT_LABELS } from "@/lib/blood-compatibility";

type PatientRef = { id: string; first_name: string; last_name: string; patient_number: string };

export function CrossmatchRequestForm() {
  const [state, formAction, pending] = useActionState(createCrossmatchRequest, null);
  const [patient, setPatient] = useState<PatientRef | null>(null);

  return (
    <form action={formAction} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Patient</CardTitle>
        </CardHeader>
        <CardContent>
          {patient ? (
            <div className="flex items-center justify-between rounded-lg border border-border bg-surface-muted px-3 py-2">
              <span className="text-sm font-medium text-foreground">
                {patient.first_name} {patient.last_name} ({patient.patient_number})
              </span>
              <button type="button" className="text-xs text-primary hover:underline" onClick={() => setPatient(null)}>
                Change
              </button>
            </div>
          ) : (
            <PatientPicker onSelect={(p) => setPatient(p)} />
          )}
          <input type="hidden" name="patient_id" value={patient?.id ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="patient_blood_group">Patient Blood Group</Label>
            <Select id="patient_blood_group" name="patient_blood_group" defaultValue="">
              <option value="">Unknown (pending grouping)</option>
              {Object.entries(BLOOD_GROUP_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="component_requested">Component Requested</Label>
            <Select id="component_requested" name="component_requested" defaultValue="packed_red_cells">
              {Object.entries(BLOOD_COMPONENT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="units_requested">Units Requested</Label>
            <Input id="units_requested" name="units_requested" type="number" defaultValue="1" min={1} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="indication">Clinical Indication</Label>
            <Textarea id="indication" name="indication" rows={2} />
          </div>
        </CardContent>
      </Card>

      {state?.error && (
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{state.error}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !patient}>
          {pending ? "Submitting..." : "Submit Crossmatch Request"}
        </Button>
      </div>
    </form>
  );
}
