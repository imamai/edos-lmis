"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { updateTenant } from "@/lib/actions/tenant-admin";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EditTenantForm({
  tenantId,
  name,
  legalName,
  code,
}: {
  tenantId: string;
  name: string;
  legalName: string | null;
  code: string;
}) {
  const [state, formAction, pending] = useActionState(updateTenant, null);
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tenant identity</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Keyed on the saved values: these inputs are uncontrolled
            (defaultValue), and this form never unmounts, so without a key
            tied to the data a successful save wouldn't visually update the
            fields even though the underlying record did. */}
        <form
          key={`${name}-${code}-${legalName ?? ""}`}
          action={formAction}
          className="space-y-4"
          onSubmit={() => router.refresh()}
        >
          <input type="hidden" name="tenant_id" value={tenantId} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="edit_name">Tenant name *</Label>
              <Input id="edit_name" name="name" defaultValue={name} required />
            </div>
            <div>
              <Label htmlFor="edit_code">Tenant code *</Label>
              <Input id="edit_code" name="code" defaultValue={code} maxLength={20} required />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="edit_legal_name">Legal name</Label>
              <Input id="edit_legal_name" name="legal_name" defaultValue={legalName ?? ""} />
            </div>
          </div>

          {state?.error && (
            <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{state.error}</p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
