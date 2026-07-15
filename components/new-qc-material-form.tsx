"use client";

import { useActionState } from "react";
import { createQcMaterial } from "@/lib/actions/qc";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export function NewQcMaterialForm({ tests }: { tests: { id: string; name: string; code: string }[] }) {
  const [state, formAction, pending] = useActionState(createQcMaterial, null);

  return (
    <form action={formAction}>
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="test_id">Test *</Label>
            <Select id="test_id" name="test_id" required defaultValue="">
              <option value="" disabled>Select a test</option>
              {tests.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="level">Control Level</Label>
            <Select id="level" name="level" defaultValue="level1">
              <option value="level1">Level 1 (Normal)</option>
              <option value="level2">Level 2 (High)</option>
              <option value="level3">Level 3 (Low/Other)</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="lot_number">Lot Number *</Label>
            <Input id="lot_number" name="lot_number" required />
          </div>
          <div>
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Input id="manufacturer" name="manufacturer" />
          </div>
          <div>
            <Label htmlFor="expiry_date">Expiry Date</Label>
            <Input id="expiry_date" name="expiry_date" type="date" />
          </div>
          <div>
            <Label htmlFor="target_mean">Target Mean *</Label>
            <Input id="target_mean" name="target_mean" type="number" step="0.0001" required />
          </div>
          <div>
            <Label htmlFor="target_sd">Target SD *</Label>
            <Input id="target_sd" name="target_sd" type="number" step="0.0001" required />
          </div>
          <div>
            <Label htmlFor="unit">Unit</Label>
            <Input id="unit" name="unit" />
          </div>
        </CardContent>
      </Card>

      {state?.error && (
        <p className="mt-4 rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{state.error}</p>
      )}

      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Register Control Lot"}
        </Button>
      </div>
    </form>
  );
}
