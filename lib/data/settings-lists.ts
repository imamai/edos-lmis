import { createClient } from "@/lib/supabase/server";

export type SettingsListItem = {
  id: string;
  value: string;
  label: string;
};

export type SettingsListItemWithStatus = SettingsListItem & { is_active: boolean };

// For pickers (new/edit forms) — only entries an admin has left checked.
export async function getSettingsList(listKey: string): Promise<SettingsListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("edoslmis_settings_lists")
    .select("id, value, label")
    .eq("list_key", listKey)
    .eq("is_active", true)
    .order("sort_order")
    .order("label");
  return data ?? [];
}

// For the Settings master-data manager — every entry, so inactive ones can
// still be re-checked rather than needing to be retyped from scratch.
export async function getSettingsListWithStatus(listKey: string): Promise<SettingsListItemWithStatus[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("edoslmis_settings_lists")
    .select("id, value, label, is_active")
    .eq("list_key", listKey)
    .order("sort_order")
    .order("label");
  return data ?? [];
}
