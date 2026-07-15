"use client";

import { useActionState } from "react";
import { assignStaffRole } from "@/lib/actions/staff";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type StaffRow = { user_id: string; first_name: string; last_name: string };
type RoleRow = { id: string; name: string; code: string };

export function AssignStaffRoleForm({ staff, roles }: { staff: StaffRow[]; roles: RoleRow[] }) {
  const [state, formAction, pending] = useActionState(assignStaffRole, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign a role</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="user_id">Staff member</Label>
            <Select id="user_id" name="user_id" required defaultValue="" className="w-56">
              <option value="" disabled>Select staff</option>
              {staff.map((s) => (
                <option key={s.user_id} value={s.user_id}>{s.first_name} {s.last_name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="role_id">Role</Label>
            <Select id="role_id" name="role_id" required defaultValue="" className="w-56">
              <option value="" disabled>Select role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Assigning..." : "Assign Role"}
          </Button>
        </form>
        {state?.error && <p className="mt-2 text-sm text-critical">{state.error}</p>}
      </CardContent>
    </Card>
  );
}
