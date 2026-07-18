"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStaff } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createStaffUser(_prevState: { error: string | null } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff.isTenantAdmin && !staff.isPlatformAdmin) {
    return { error: "Only a tenant or platform administrator can create staff accounts." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const staffCategory = String(formData.get("staff_category") ?? "").trim() || null;
  const grantAdmin = formData.get("is_tenant_admin") === "on" && staff.isTenantAdmin;
  const roleIds = formData.getAll("role_id").map(String).filter(Boolean);
  const permissions = formData.getAll("permission").map(String).filter(Boolean);

  if (!email || !firstName || !lastName) return { error: "First name, last name, and email are required." };
  if (password.length < 8) return { error: "Temporary password must be at least 8 characters." };

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });
  if (createError || !created?.user) {
    return { error: createError?.message ?? "Could not create the login." };
  }

  const supabase = await createClient();
  const { error: profileError } = await supabase.rpc("edoslmis_create_staff_profile", {
    p_user_id: created.user.id,
    p_first_name: firstName,
    p_last_name: lastName,
    p_phone: phone,
    p_staff_category: staffCategory,
    p_branch_id: staff.branchId,
    p_is_tenant_admin: grantAdmin,
  });
  if (profileError) {
    // Roll back the orphaned login so a failed profile creation doesn't
    // leave a dangling account with no profile.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: profileError.message };
  }

  for (const roleId of roleIds) {
    await supabase.rpc("edoslmis_assign_staff_role", {
      p_user_id: created.user.id,
      p_role_id: roleId,
      p_branch_id: staff.branchId,
    });
  }

  if (permissions.length > 0) {
    await supabase.rpc("edoslmis_set_user_permission_overrides", {
      p_user_id: created.user.id,
      p_permissions: permissions,
    });
  }

  revalidatePath("/staff");
  return { error: null, email, password };
}

export async function setStaffActive(userId: string, isActive: boolean) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.rpc("edoslmis_set_staff_active", {
    p_user_id: userId,
    p_is_active: isActive,
  });
  if (error) return { error: error.message };

  revalidatePath("/staff");
  return { error: null };
}

export async function assignStaffRole(_prevState: { error: string | null } | null, formData: FormData) {
  const userId = String(formData.get("user_id") ?? "");
  const roleId = String(formData.get("role_id") ?? "");
  if (!userId || !roleId) return { error: "Select a staff member and a role." };

  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.rpc("edoslmis_assign_staff_role", {
    p_user_id: userId,
    p_role_id: roleId,
    p_branch_id: null,
  });
  if (error) return { error: error.message };

  revalidatePath("/staff");
  return { error: null };
}

export async function setStaffRoleActive(userRoleId: string, isActive: boolean) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.rpc("edoslmis_set_staff_role_active", {
    p_user_role_id: userRoleId,
    p_is_active: isActive,
  });
  if (error) return { error: error.message };

  revalidatePath("/staff");
  return { error: null };
}

export async function updateStaffPermissionOverrides(
  _prevState: { error: string | null } | null,
  formData: FormData
) {
  const userId = String(formData.get("user_id") ?? "");
  if (!userId) return { error: "Missing staff member." };
  const permissions = formData.getAll("permission").map(String).filter(Boolean);

  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.rpc("edoslmis_set_user_permission_overrides", {
    p_user_id: userId,
    p_permissions: permissions,
  });
  if (error) return { error: error.message };

  revalidatePath("/staff");
  return { error: null };
}
