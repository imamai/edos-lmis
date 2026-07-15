import { getCurrentStaff } from "@/lib/auth";
import { getStaffWithRoles, getTenantRoles } from "@/lib/data/staff";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateStaffUserForm } from "@/components/create-staff-user-form";
import { AssignStaffRoleForm } from "@/components/assign-staff-role-form";
import { StaffRoleToggle } from "@/components/staff-role-toggle";
import { StaffActiveToggle } from "@/components/staff-active-toggle";

export default async function StaffPage() {
  const staff = await getCurrentStaff();

  if (!staff.isTenantAdmin && !staff.isPlatformAdmin) {
    return (
      <div className="mx-auto max-w-md space-y-2 py-16 text-center">
        <h1 className="text-lg font-semibold text-foreground">Admins only</h1>
        <p className="text-sm text-muted-foreground">
          Staff role management can only be changed by a tenant or platform administrator.
        </p>
      </div>
    );
  }

  const [{ data: members, error: membersError }, { data: roles, error: rolesError }] = await Promise.all([
    getStaffWithRoles(),
    getTenantRoles(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Staff</h1>
        <p className="text-sm text-muted-foreground">
          Create staff accounts, grant EDOS LMIS roles, and activate or deactivate access
        </p>
      </div>

      <CreateStaffUserForm roles={roles} />

      <AssignStaffRoleForm staff={members.map((m) => ({ user_id: m.user_id, first_name: m.first_name, last_name: m.last_name }))} roles={roles} />

      {(membersError || rolesError) && (
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{membersError ?? rolesError}</p>
      )}

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Staff & roles</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Roles</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No staff found.</td>
                </tr>
              )}
              {members.map((m) => (
                <tr key={m.user_id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium text-foreground">{m.first_name} {m.last_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.staff_category ?? "-"}</td>
                  <td className="px-4 py-3">
                    <StaffActiveToggle userId={m.user_id} isActive={m.is_active} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {m.roles.length === 0 && <span className="text-muted-foreground">No roles assigned</span>}
                      {m.roles.map((r) => (
                        <StaffRoleToggle
                          key={r.user_role_id}
                          userRoleId={r.user_role_id}
                          roleName={r.role_name}
                          isActive={r.is_active}
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
