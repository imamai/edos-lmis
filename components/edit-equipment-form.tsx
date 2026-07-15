"use client";

import { useActionState } from "react";
import { updateEquipment } from "@/lib/actions/equipment";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type EquipmentTypeOption = { value: string; label: string };

type EquipmentRecord = {
  id: string;
  code: string;
  name: string;
  equipment_type: string;
  department_id: string | null;
  manufacturer: string | null;
  model: string | null;
  serial_number: string | null;
  location: string | null;
  installation_date: string | null;
  calibration_interval_days: number | null;
  maintenance_interval_days: number | null;
};

export function EditEquipmentForm({
  equipment,
  departments,
  equipmentTypes,
}: {
  equipment: EquipmentRecord;
  departments: { id: string; name: string }[];
  equipmentTypes: EquipmentTypeOption[];
}) {
  const [state, formAction, pending] = useActionState(updateEquipment, null);
  const typeOptions = equipmentTypes.some((t) => t.value === equipment.equipment_type)
    ? equipmentTypes
    : [...equipmentTypes, { value: equipment.equipment_type, label: equipment.equipment_type }];

  return (
    <form action={formAction}>
      <input type="hidden" name="equipment_id" value={equipment.id} />
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="code">Asset Code *</Label>
            <Input id="code" name="code" required defaultValue={equipment.code} />
          </div>
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" required defaultValue={equipment.name} />
          </div>
          <div>
            <Label htmlFor="equipment_type">Type</Label>
            <Select id="equipment_type" name="equipment_type" defaultValue={equipment.equipment_type}>
              {typeOptions.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="department_id">Department</Label>
            <Select id="department_id" name="department_id" defaultValue={equipment.department_id ?? ""}>
              <option value="">Unassigned</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Input id="manufacturer" name="manufacturer" defaultValue={equipment.manufacturer ?? ""} />
          </div>
          <div>
            <Label htmlFor="model">Model</Label>
            <Input id="model" name="model" defaultValue={equipment.model ?? ""} />
          </div>
          <div>
            <Label htmlFor="serial_number">Serial Number</Label>
            <Input id="serial_number" name="serial_number" defaultValue={equipment.serial_number ?? ""} />
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input id="location" name="location" defaultValue={equipment.location ?? ""} />
          </div>
          <div>
            <Label htmlFor="installation_date">Installation Date</Label>
            <Input id="installation_date" name="installation_date" type="date" defaultValue={equipment.installation_date ?? ""} />
          </div>
          <div />
          <div>
            <Label htmlFor="calibration_interval_days">Calibration Interval (days)</Label>
            <Input id="calibration_interval_days" name="calibration_interval_days" type="number" defaultValue={equipment.calibration_interval_days ?? ""} />
          </div>
          <div>
            <Label htmlFor="maintenance_interval_days">Maintenance Interval (days)</Label>
            <Input id="maintenance_interval_days" name="maintenance_interval_days" type="number" defaultValue={equipment.maintenance_interval_days ?? ""} />
          </div>
        </CardContent>
      </Card>

      {state?.error && (
        <p className="mt-4 rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{state.error}</p>
      )}

      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
