"use client";

import { useActionState } from "react";
import { updateQcMaterial } from "@/lib/actions/qc";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export function EditQcMaterialForm({
  material,
}: {
  material: {
    id: string;
    lot_number: string;
    manufacturer: string | null;
    expiry_date: string | null;
    target_mean: number;
    target_sd: number;
    unit: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState(updateQcMaterial, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="material_id" value={material.id} />
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="lot_number">Lot Number *</Label>
            <Input id="lot_number" name="lot_number" defaultValue={material.lot_number} required />
          </div>
          <div>
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Input id="manufacturer" name="manufacturer" defaultValue={material.manufacturer ?? ""} />
          </div>
          <div>
            <Label htmlFor="expiry_date">Expiry Date</Label>
            <Input id="expiry_date" name="expiry_date" type="date" defaultValue={material.expiry_date ?? ""} />
          </div>
          <div>
            <Label htmlFor="unit">Unit</Label>
            <Input id="unit" name="unit" defaultValue={material.unit ?? ""} />
          </div>
          <div>
            <Label htmlFor="target_mean">Target Mean *</Label>
            <Input id="target_mean" name="target_mean" type="number" step="0.0001" defaultValue={material.target_mean} required />
          </div>
          <div>
            <Label htmlFor="target_sd">Target SD *</Label>
            <Input id="target_sd" name="target_sd" type="number" step="0.0001" defaultValue={material.target_sd} required />
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
