import { createClient } from "@/lib/supabase/server";

export type SettingsListItem = {
  id: string;
  value: string;
  label: string;
};

export async function getSettingsList(listKey: string): Promise<SettingsListItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("edoslmis_settings_lists")
    .select("id, value, label")
    .eq("list_key", listKey)
    .order("sort_order")
    .order("label");
  return data ?? [];
}
