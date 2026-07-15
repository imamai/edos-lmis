import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type CurrentStaff = {
  userId: string;
  tenantId: string;
  branchId: string | null;
  branchName: string | null;
  firstName: string;
  lastName: string;
  staffCategory: string | null;
  isPlatformAdmin: boolean;
  isTenantAdmin: boolean;
  permissions: Set<string>;
};

export async function getCurrentStaff(): Promise<CurrentStaff> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: rpcData } = await supabase.rpc("edoslmis_get_current_staff").single();

  if (!rpcData) {
    redirect("/no-access");
  }

  const staff = rpcData as {
    user_id: string;
    tenant_id: string;
    branch_id: string | null;
    branch_name: string | null;
    first_name: string;
    last_name: string;
    staff_category: string | null;
    is_platform_admin: boolean;
    is_tenant_admin: boolean;
    permissions: string[] | null;
  };

  return {
    userId: staff.user_id,
    tenantId: staff.tenant_id,
    branchId: staff.branch_id,
    branchName: staff.branch_name,
    firstName: staff.first_name,
    lastName: staff.last_name,
    staffCategory: staff.staff_category,
    isPlatformAdmin: staff.is_platform_admin,
    isTenantAdmin: staff.is_tenant_admin,
    permissions: new Set(staff.permissions ?? []),
  };
}

export function can(staff: CurrentStaff, permission: string): boolean {
  return staff.isPlatformAdmin || staff.isTenantAdmin || staff.permissions.has(permission);
}
