"use client";

import { useActionState, useState } from "react";
import { createStaffUser } from "@/lib/actions/staff";
import { STAFF_CATEGORIES } from "@/lib/staff-categories";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RoleRow = { id: string; name: string; code: string };

function generatePassword() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 16);
}

export function CreateStaffUserForm({ roles }: { roles: RoleRow[] }) {
  const [state, formAction, pending] = useActionState(createStaffUser, null);
  const [password, setPassword] = useState("");
  const [dismissed, setDismissed] = useState(false);

  const created = !dismissed && state && !state.error && "email" in state ? state : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create staff account</CardTitle>
      </CardHeader>
      <CardContent>
        {created ? (
          <div className="space-y-3 rounded-lg bg-success/10 px-3 py-3 text-sm text-foreground">
            <p>
              Account created for <span className="font-medium">{created.email}</span>. Share this temporary
              password with them securely — it will not be shown again:
            </p>
            <p className="rounded bg-surface-muted px-2 py-1 font-mono text-sm">{created.password}</p>
            <Button variant="outline" onClick={() => setDismissed(true)}>
              Create another account
            </Button>
          </div>
        ) : (
          <form
            action={formAction}
            className="space-y-4"
            onSubmit={() => {
              setPassword("");
              setDismissed(false);
            }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="first_name">First name *</Label>
                <Input id="first_name" name="first_name" required />
              </div>
              <div>
                <Label htmlFor="last_name">Last name *</Label>
                <Input id="last_name" name="last_name" required />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" />
              </div>
              <div>
                <Label htmlFor="staff_category">Staff category</Label>
                <Select id="staff_category" name="staff_category" defaultValue="">
                  <option value="">Unspecified</option>
                  {STAFF_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="password">Temporary password *</Label>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    name="password"
                    type="text"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button type="button" variant="outline" onClick={() => setPassword(generatePassword())}>
                    Generate
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label>Roles</Label>
              <div className="flex flex-wrap gap-3">
                {roles.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" name="role_id" value={r.id} className="h-4 w-4" />
                    {r.name}
                  </label>
                ))}
                {roles.length === 0 && <p className="text-sm text-muted-foreground">No roles defined for this tenant yet.</p>}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" name="is_tenant_admin" className="h-4 w-4" />
              Grant tenant admin rights (full access, in addition to any roles above)
            </label>

            {state?.error && (
              <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{state.error}</p>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {pending ? "Creating..." : "Create Account"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
