import { createClient } from "@/lib/supabase/server";
import { getSettingsList } from "@/lib/data/settings-lists";
import { EditEquipmentForm } from "@/components/edit-equipment-form";
import { notFound } from "next/navigation";

export default async function EditEquipmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: equipment }, { data: departments }, equipmentTypes] = await Promise.all([
    supabase
      .from("edoslmis_equipment")
      .select(
        "id, code, name, equipment_type, department_id, manufacturer, model, serial_number, location, installation_date, calibration_interval_days, maintenance_interval_days"
      )
      .eq("id", id)
      .single(),
    supabase.from("edoslmis_departments").select("id, name").eq("is_active", true).order("name"),
    getSettingsList("equipment_type"),
  ]);

  if (!equipment) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Edit Equipment</h1>
        <p className="text-sm text-muted-foreground">Update this asset&apos;s details</p>
      </div>
      <EditEquipmentForm equipment={equipment} departments={departments ?? []} equipmentTypes={equipmentTypes} />
    </div>
  );
}
