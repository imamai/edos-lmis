"use server";

import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStaff } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function generateTempPassword() {
  return randomBytes(12).toString("base64url").slice(0, 16);
}

export async function createTenant(_prevState: { error: string | null } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff.isPlatformAdmin) {
    return { error: "Only a platform administrator can create tenants." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const legalName = String(formData.get("legal_name") ?? "").trim() || null;
  const branchCode = String(formData.get("branch_code") ?? "").trim() || "MAIN";
  const branchName = String(formData.get("branch_name") ?? "").trim() || name;
  const adminFirstName = String(formData.get("admin_first_name") ?? "").trim();
  const adminLastName = String(formData.get("admin_last_name") ?? "").trim();
  const adminEmail = String(formData.get("admin_email") ?? "").trim();
  const adminPhone = String(formData.get("admin_phone") ?? "").trim() || null;
  const adminPassword = String(formData.get("admin_password") ?? "");

  if (!name) return { error: "Tenant name is required." };
  if (!adminFirstName || !adminLastName || !adminEmail) {
    return { error: "The first admin's name and email are required." };
  }
  if (adminPassword.length < 8) return { error: "Temporary password must be at least 8 characters." };

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { first_name: adminFirstName, last_name: adminLastName },
  });
  if (createError || !created?.user) {
    return { error: createError?.message ?? "Could not create the admin login." };
  }

  const supabase = await createClient();
  const { data: result, error: rpcError } = await supabase
    .rpc("edoslmis_create_tenant", {
      p_name: name,
      p_legal_name: legalName,
      p_branch_code: branchCode,
      p_branch_name: branchName,
      p_admin_user_id: created.user.id,
      p_admin_first_name: adminFirstName,
      p_admin_last_name: adminLastName,
      p_admin_phone: adminPhone,
    })
    .single();

  if (rpcError) {
    // Roll back the orphaned login so a failed tenant/branch/profile creation
    // doesn't leave a dangling account with no tenant to sign into.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: rpcError.message };
  }

  revalidatePath("/admin/tenants");
  return { error: null, email: adminEmail, password: adminPassword, tenantId: (result as { tenant_id: string }).tenant_id };
}

export async function updateTenant(_prevState: { error: string | null } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff.isPlatformAdmin) return { error: "Only a platform administrator can edit tenants." };

  const tenantId = String(formData.get("tenant_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const legalName = String(formData.get("legal_name") ?? "").trim() || null;
  const code = String(formData.get("code") ?? "").trim();
  if (!tenantId || !name || !code) return { error: "Tenant name and code are required." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("edoslmis_update_tenant", {
    p_tenant_id: tenantId,
    p_name: name,
    p_legal_name: legalName,
    p_code: code,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/tenants");
  revalidatePath(`/admin/tenants/${tenantId}`);
  return { error: null };
}

export async function setTenantActive(tenantId: string, isActive: boolean) {
  const staff = await getCurrentStaff();
  if (!staff.isPlatformAdmin) return { error: "Only a platform administrator can change tenant status." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("edoslmis_set_tenant_active", {
    p_tenant_id: tenantId,
    p_is_active: isActive,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/tenants");
  revalidatePath(`/admin/tenants/${tenantId}`);
  return { error: null };
}

export async function deleteTenant(tenantId: string) {
  const staff = await getCurrentStaff();
  if (!staff.isPlatformAdmin) return { error: "Only a platform administrator can delete tenants." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("edoslmis_delete_tenant", { p_tenant_id: tenantId });
  if (error) return { error: error.message };

  revalidatePath("/admin/tenants");
  return { error: null };
}

export async function updateTenantAdmin(_prevState: { error: string | null } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  if (!staff.isPlatformAdmin) return { error: "Only a platform administrator can edit a tenant admin." };

  const userId = String(formData.get("user_id") ?? "");
  const tenantId = String(formData.get("tenant_id") ?? "");
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim();
  if (!userId || !tenantId || !firstName || !lastName || !email) {
    return { error: "First name, last name, and email are required." };
  }

  // Email lives in auth.users, not the profile row — change it first (more
  // likely to fail, e.g. already in use by another account) so a rejected
  // email change never leaves the name/phone update applied without it.
  const admin = createAdminClient();
  const { error: emailError } = await admin.auth.admin.updateUserById(userId, { email, email_confirm: true });
  if (emailError) return { error: emailError.message };

  const supabase = await createClient();
  const { error } = await supabase.rpc("edoslmis_update_tenant_admin", {
    p_user_id: userId,
    p_tenant_id: tenantId,
    p_first_name: firstName,
    p_last_name: lastName,
    p_phone: phone,
  });
  if (error) return { error: error.message };

  revalidatePath(`/admin/tenants/${tenantId}`);
  return { error: null };
}

export async function deleteTenantAdmin(userId: string, tenantId: string) {
  const staff = await getCurrentStaff();
  if (!staff.isPlatformAdmin) return { error: "Only a platform administrator can remove a tenant admin." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("edoslmis_delete_tenant_admin", {
    p_user_id: userId,
    p_tenant_id: tenantId,
  });
  if (error) return { error: error.message };

  // Only remove the login once the profile row is confirmed gone, so a
  // blocked SQL delete (e.g. real data still referencing them) never leaves
  // someone locked out with their record still intact.
  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(userId);

  revalidatePath(`/admin/tenants/${tenantId}`);
  return { error: null };
}

export async function resetTenantAdminPassword(
  userId: string,
  _prevState: { error: string | null; password?: string } | null,
  _formData: FormData
) {
  const staff = await getCurrentStaff();
  if (!staff.isPlatformAdmin) {
    return { error: "Only a platform administrator can reset a tenant admin's password." };
  }

  const password = generateTempPassword();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message };

  return { error: null, password };
}
