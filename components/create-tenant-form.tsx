"use client";

import { useActionState, useState } from "react";
import { createTenant } from "@/lib/actions/tenant-admin";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function generatePassword() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 16);
}

export function CreateTenantForm() {
  const [state, formAction, pending] = useActionState(createTenant, null);
  const [password, setPassword] = useState("");
  const [dismissed, setDismissed] = useState(false);

  const created = !dismissed && state && !state.error && "email" in state ? state : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create tenant</CardTitle>
      </CardHeader>
      <CardContent>
        {created ? (
          <div className="space-y-3 rounded-lg bg-success/10 px-3 py-3 text-sm text-foreground">
            <p>
              Tenant created, with a first admin login for{" "}
              <span className="font-medium">{created.email}</span>. Share this temporary password with them
              securely — it will not be shown again:
            </p>
            <p className="rounded bg-surface-muted px-2 py-1 font-mono text-sm">{created.password}</p>
            <Button variant="outline" onClick={() => setDismissed(true)}>
              Create another tenant
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
                <Label htmlFor="name">Tenant name *</Label>
                <Input id="name" name="name" required />
                <p className="mt-1 text-xs text-muted-foreground">A tenant code is generated automatically from this name.</p>
              </div>
              <div>
                <Label htmlFor="legal_name">Legal name</Label>
                <Input id="legal_name" name="legal_name" />
              </div>
              <div>
                <Label htmlFor="branch_name">Main branch name</Label>
                <Input id="branch_name" name="branch_name" placeholder="Defaults to tenant name" />
              </div>
              <div>
                <Label htmlFor="branch_code">Main branch code</Label>
                <Input id="branch_code" name="branch_code" maxLength={20} placeholder="Defaults to MAIN" />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-foreground">First admin account</h3>
              <p className="text-xs text-muted-foreground">
                Creates the tenant&apos;s first login, with tenant-admin rights.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="admin_first_name">First name *</Label>
                <Input id="admin_first_name" name="admin_first_name" required />
              </div>
              <div>
                <Label htmlFor="admin_last_name">Last name *</Label>
                <Input id="admin_last_name" name="admin_last_name" required />
              </div>
              <div>
                <Label htmlFor="admin_email">Email *</Label>
                <Input id="admin_email" name="admin_email" type="email" required />
              </div>
              <div>
                <Label htmlFor="admin_phone">Phone</Label>
                <Input id="admin_phone" name="admin_phone" type="tel" />
              </div>
              <div>
                <Label htmlFor="admin_password">Temporary password *</Label>
                <div className="flex gap-2">
                  <Input
                    id="admin_password"
                    name="admin_password"
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

            {state?.error && (
              <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{state.error}</p>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={pending}>
                {pending ? "Creating..." : "Create Tenant"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
