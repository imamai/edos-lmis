import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStaff } from "@/lib/auth";

export type TenantListRow = {
  id: string;
  code: string;
  name: string;
  legal_name: string | null;
  status: string;
  facility_type: string;
  created_at: string;
  deleted_at: string | null;
  clinic_name: string | null;
  logo_path: string | null;
  theme_color: string | null;
  settings_updated_at: string | null;
};

export async function listTenants(): Promise<{ data: TenantListRow[]; error: string | null }> {
  const staff = await getCurrentStaff();
  if (!staff.isPlatformAdmin) return { data: [], error: "Only a platform administrator can list tenants." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("edoslmis_list_tenants");
  if (error) return { data: [], error: error.message };

  return { data: (data ?? []) as TenantListRow[], error: null };
}

export type TenantAdminRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
};

export async function listTenantAdmins(tenantId: string): Promise<{ data: TenantAdminRow[]; error: string | null }> {
  const staff = await getCurrentStaff();
  if (!staff.isPlatformAdmin) return { data: [], error: "Only a platform administrator can list tenant admins." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("edoslmis_list_tenant_admins", { p_tenant_id: tenantId });
  if (error) return { data: [], error: error.message };

  const rows = (data ?? []) as Omit<TenantAdminRow, "email">[];

  // Email lives in auth.users, not the profile row the RPC above reads —
  // only the Auth Admin API can resolve it, one lookup per admin (tenants
  // have a handful of admins at most, so this stays cheap).
  const admin = createAdminClient();
  const withEmail = await Promise.all(
    rows.map(async (row) => {
      const { data: userData } = await admin.auth.admin.getUserById(row.id);
      return { ...row, email: userData?.user?.email ?? null };
    })
  );

  return { data: withEmail, error: null };
}
