import { createClient } from "@/lib/supabase/server";
import { getSettingsList } from "@/lib/data/settings-lists";
import { NewEquipmentForm } from "@/components/new-equipment-form";

export default async function NewEquipmentPage() {
  const supabase = await createClient();
  const [{ data: departments }, equipmentTypes] = await Promise.all([
    supabase.from("edoslmis_departments").select("id, name").eq("is_active", true).order("name"),
    getSettingsList("equipment_type"),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Register Equipment</h1>
        <p className="text-sm text-muted-foreground">Add an analyzer or instrument to the asset register</p>
      </div>
      <NewEquipmentForm departments={departments ?? []} equipmentTypes={equipmentTypes} />
    </div>
  );
}
