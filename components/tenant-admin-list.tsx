"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { resetTenantAdminPassword, updateTenantAdmin, deleteTenantAdmin } from "@/lib/actions/tenant-admin";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TenantAdminRow } from "@/lib/data/tenant-admin";

function EditAdminForm({
  admin,
  tenantId,
  onDone,
}: {
  admin: TenantAdminRow;
  tenantId: string;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateTenantAdmin, null);
  const router = useRouter();

  return (
    <form
      action={formAction}
      className="space-y-3"
      onSubmit={() => {
        router.refresh();
        onDone();
      }}
    >
      <input type="hidden" name="user_id" value={admin.id} />
      <input type="hidden" name="tenant_id" value={tenantId} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`first_name_${admin.id}`}>First name *</Label>
          <Input id={`first_name_${admin.id}`} name="first_name" defaultValue={admin.first_name} required />
        </div>
        <div>
          <Label htmlFor={`last_name_${admin.id}`}>Last name *</Label>
          <Input id={`last_name_${admin.id}`} name="last_name" defaultValue={admin.last_name} required />
        </div>
        <div>
          <Label htmlFor={`email_${admin.id}`}>Email (login) *</Label>
          <Input id={`email_${admin.id}`} name="email" type="email" defaultValue={admin.email ?? ""} required />
        </div>
        <div>
          <Label htmlFor={`phone_${admin.id}`}>Phone</Label>
          <Input id={`phone_${admin.id}`} name="phone" type="tel" defaultValue={admin.phone ?? ""} />
        </div>
      </div>
      {state?.error && <p className="text-sm text-critical">{state.error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}

function AdminRow({ admin, tenantId }: { admin: TenantAdminRow; tenantId: string }) {
  const [resetState, resetAction, resetPending] = useActionState(resetTenantAdminPassword.bind(null, admin.id), null);
  const [editing, setEditing] = useState(false);
  const [isDeleting, startDeleting] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const router = useRouter();

  if (editing) {
    return (
      <div className="border-t border-border px-4 py-3">
        <EditAdminForm admin={admin} tenantId={tenantId} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">
            {admin.first_name} {admin.last_name}
          </span>
          <Badge tone={admin.is_active ? "success" : "critical"}>{admin.is_active ? "Active" : "Inactive"}</Badge>
        </div>
        {admin.email && <p className="text-xs text-muted-foreground">{admin.email}</p>}
      </div>
      <div className="space-y-1 text-right">
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setEditing(true)}>
            Edit
          </Button>
          {resetState?.password ? (
            <p className="rounded bg-surface-muted px-2 py-1 font-mono text-sm">{resetState.password}</p>
          ) : (
            <form action={resetAction}>
              <Button type="submit" variant="outline" disabled={resetPending}>
                {resetPending ? "Resetting..." : "Reset password"}
              </Button>
            </form>
          )}
          <Button
            type="button"
            variant="danger"
            disabled={isDeleting}
            onClick={() => {
              if (!window.confirm(`Remove ${admin.first_name} ${admin.last_name}'s admin account? This deletes their login and cannot be undone.`)) {
                return;
              }
              startDeleting(async () => {
                const result = await deleteTenantAdmin(admin.id, tenantId);
                if (result?.error) {
                  setDeleteError(result.error);
                  return;
                }
                router.refresh();
              });
            }}
          >
            {isDeleting ? "Removing..." : "Remove"}
          </Button>
        </div>
        {resetState?.password && (
          <p className="text-xs text-muted-foreground">Share this once — it won&apos;t be shown again.</p>
        )}
        {resetState?.error && <p className="text-sm text-critical">{resetState.error}</p>}
        {deleteError && <p className="text-sm text-critical">{deleteError}</p>}
      </div>
    </div>
  );
}

export function TenantAdminList({ admins, tenantId }: { admins: TenantAdminRow[]; tenantId: string }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Tenant admins</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {admins.length === 0 && (
          <p className="px-4 py-4 text-sm text-muted-foreground">No tenant admins found for this tenant.</p>
        )}
        {admins.map((a) => (
          <AdminRow key={a.id} admin={a} tenantId={tenantId} />
        ))}
      </CardContent>
    </Card>
  );
}
