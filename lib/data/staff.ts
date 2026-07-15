import { createClient } from "@/lib/supabase/server";

export type StaffRoleAssignment = {
  user_role_id: string;
  role_id: string;
  role_code: string;
  role_name: string;
  is_active: boolean;
};

export type StaffMember = {
  user_id: string;
  first_name: string;
  last_name: string;
  staff_category: string | null;
  is_active: boolean;
  roles: StaffRoleAssignment[];
};

export async function getStaffWithRoles(): Promise<{ data: StaffMember[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("edoslmis_list_staff_with_roles");
  if (error) return { data: [], error: error.message };
  return {
    data: (data ?? []).map((row: { user_id: string; first_name: string; last_name: string; staff_category: string | null; is_active: boolean; roles: StaffRoleAssignment[] | null }) => ({
      user_id: row.user_id,
      first_name: row.first_name,
      last_name: row.last_name,
      staff_category: row.staff_category,
      is_active: row.is_active,
      roles: row.roles ?? [],
    })),
    error: null,
  };
}


export type TenantRole = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  permissions: string[];
};

export async function getTenantRoles(): Promise<{ data: TenantRole[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("edoslmis_list_tenant_roles");
  if (error) return { data: [], error: error.message };
  return { data: data ?? [], error: null };
}
