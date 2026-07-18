"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { revalidatePath } from "next/cache";

function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export async function addListItem(_prevState: { error: string | null } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const listKey = String(formData.get("list_key") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  if (!listKey || !label) return { error: "Enter a name." };

  const value = slugify(label);
  if (!value) return { error: "Enter a name with at least one letter or number." };

  const { error } = await supabase.from("edoslmis_settings_lists").insert({
    tenant_id: staff.tenantId,
    list_key: listKey,
    value,
    label,
    created_by: staff.userId,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/inventory/new");
  revalidatePath("/equipment/new");
  return { error: null };
}

export async function deleteListItem(id: string) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_settings_lists").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/inventory/new");
  revalidatePath("/equipment/new");
  return { error: null };
}

export async function setListItemActive(id: string, isActive: boolean) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_settings_lists").update({ is_active: isActive }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/inventory/new");
  revalidatePath("/equipment/new");
  return { error: null };
}
