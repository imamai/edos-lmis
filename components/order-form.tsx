"use client";

import { useActionState, useState } from "react";
import { createOrder } from "@/lib/actions/orders";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PatientPicker } from "@/components/patient-picker";

type PatientRef = { id: string; first_name: string; last_name: string; patient_number: string };

type TestRow = { id: string; code: string; name: string; price: number; department_id: string | null };
type PanelRow = { id: string; code: string; name: string; price: number; department_id: string | null };
type DepartmentRow = { id: string; name: string };

export function OrderForm({
  initialPatient,
  departments,
  tests,
  panels,
}: {
  initialPatient: PatientRef | null;
  departments: DepartmentRow[];
  tests: TestRow[];
  panels: PanelRow[];
}) {
  const [state, formAction, pending] = useActionState(createOrder, null);
  const [patient, setPatient] = useState<PatientRef | null>(initialPatient);

  const deptName = (id: string | null) => departments.find((d) => d.id === id)?.name ?? "Other";

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
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => setPatient(null)}
              >
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
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="ordering_clinician">Ordering clinician</Label>
            <Input id="ordering_clinician" name="ordering_clinician" />
          </div>
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select id="priority" name="priority" defaultValue="routine">
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="stat">STAT</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="clinical_indication">Clinical indication</Label>
            <Textarea id="clinical_indication" name="clinical_indication" rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Panels</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {panels.map((panel) => (
            <label
              key={panel.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-muted"
            >
              <span>
                <span className="font-medium text-foreground">{panel.name}</span>{" "}
                <Badge tone="neutral" className="ml-1">{deptName(panel.department_id)}</Badge>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground">KES {panel.price}</span>
                <input type="checkbox" name="panel_ids" value={panel.id} />
              </span>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Individual Tests</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {tests.map((test) => (
            <label
              key={test.id}
              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-muted"
            >
              <span>
                <span className="font-medium text-foreground">{test.name}</span>{" "}
                <Badge tone="neutral" className="ml-1">{deptName(test.department_id)}</Badge>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-muted-foreground">KES {test.price}</span>
                <input type="checkbox" name="test_ids" value={test.id} />
              </span>
            </label>
          ))}
        </CardContent>
      </Card>

      {state?.error && (
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{state.error}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending || !patient}>
          {pending ? "Creating order..." : "Create Order"}
        </Button>
      </div>
    </form>
  );
}
