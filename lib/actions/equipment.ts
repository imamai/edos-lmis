"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createEquipment(_prevState: { error: string } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!code || !name) return { error: "Code and name are required." };

  const calibrationInterval = Number(formData.get("calibration_interval_days") ?? 0) || null;
  const maintenanceInterval = Number(formData.get("maintenance_interval_days") ?? 0) || null;

  const { data: equipment, error } = await supabase
    .from("edoslmis_equipment")
    .insert({
      tenant_id: staff.tenantId,
      branch_id: staff.branchId,
      department_id: String(formData.get("department_id") ?? "") || null,
      code,
      name,
      equipment_type: String(formData.get("equipment_type") ?? "other"),
      manufacturer: String(formData.get("manufacturer") ?? "").trim() || null,
      model: String(formData.get("model") ?? "").trim() || null,
      serial_number: String(formData.get("serial_number") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      installation_date: String(formData.get("installation_date") ?? "") || null,
      calibration_interval_days: calibrationInterval,
      maintenance_interval_days: maintenanceInterval,
      created_by: staff.userId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  redirect(`/equipment/${equipment.id}`);
}

export async function updateEquipment(_prevState: { error: string } | null, formData: FormData) {
  await getCurrentStaff();
  const supabase = await createClient();

  const equipmentId = String(formData.get("equipment_id") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!code || !name) return { error: "Code and name are required." };

  const calibrationInterval = Number(formData.get("calibration_interval_days") ?? 0) || null;
  const maintenanceInterval = Number(formData.get("maintenance_interval_days") ?? 0) || null;

  const { error } = await supabase
    .from("edoslmis_equipment")
    .update({
      department_id: String(formData.get("department_id") ?? "") || null,
      code,
      name,
      equipment_type: String(formData.get("equipment_type") ?? "other"),
      manufacturer: String(formData.get("manufacturer") ?? "").trim() || null,
      model: String(formData.get("model") ?? "").trim() || null,
      serial_number: String(formData.get("serial_number") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim() || null,
      installation_date: String(formData.get("installation_date") ?? "") || null,
      calibration_interval_days: calibrationInterval,
      maintenance_interval_days: maintenanceInterval,
    })
    .eq("id", equipmentId);

  if (error) return { error: error.message };

  redirect(`/equipment/${equipmentId}`);
}

export async function deleteEquipment(equipmentId: string) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_equipment").delete().eq("id", equipmentId);
  if (error) {
    if (error.code === "23503") {
      return { error: "This equipment has service or result history and can't be deleted — deactivate it instead." };
    }
    return { error: error.message };
  }

  revalidatePath("/equipment");
  redirect("/equipment");
}

export async function setEquipmentActive(equipmentId: string, isActive: boolean) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase
    .from("edoslmis_equipment")
    .update({ is_active: isActive })
    .eq("id", equipmentId);

  if (error) return { error: error.message };

  revalidatePath(`/equipment/${equipmentId}`);
  revalidatePath("/equipment");
  return { error: null };
}

export async function logMaintenance(
  _prevState: { error: string | null } | null,
  formData: FormData
) {
  const equipmentId = String(formData.get("equipment_id") ?? "");
  const maintenanceType = String(formData.get("maintenance_type") ?? "");
  const description = String(formData.get("description") ?? "").trim() || null;
  const vendorName = String(formData.get("vendor_name") ?? "").trim() || null;
  const cost = Number(formData.get("cost") ?? 0) || null;
  const downtimeHours = Number(formData.get("downtime_hours") ?? 0) || 0;
  const nextDueDate = String(formData.get("next_due_date") ?? "") || null;

  if (!equipmentId || !maintenanceType) {
    return { error: "Select a maintenance type." };
  }

  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_equipment_maintenance_logs").insert({
    tenant_id: staff.tenantId,
    equipment_id: equipmentId,
    maintenance_type: maintenanceType,
    performed_by: staff.userId,
    vendor_name: vendorName,
    description,
    cost,
    downtime_hours: downtimeHours,
    next_due_date: nextDueDate,
    created_by: staff.userId,
  });

  if (error) return { error: error.message };

  revalidatePath(`/equipment/${equipmentId}`);
  revalidatePath("/equipment");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function reportDowntime(
  _prevState: { error: string | null } | null,
  formData: FormData
) {
  const equipmentId = String(formData.get("equipment_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!equipmentId || !reason) return { error: "Enter a reason for the downtime." };

  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_equipment_downtime_logs").insert({
    tenant_id: staff.tenantId,
    equipment_id: equipmentId,
    reason,
    reported_by: staff.userId,
  });

  if (error) return { error: error.message };

  revalidatePath(`/equipment/${equipmentId}`);
  revalidatePath("/equipment");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function resolveDowntime(
  _prevState: { error: string | null } | null,
  formData: FormData
) {
  const downtimeId = String(formData.get("downtime_id") ?? "");
  const equipmentId = String(formData.get("equipment_id") ?? "");
  if (!downtimeId) return { error: "Missing downtime record." };

  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase
    .from("edoslmis_equipment_downtime_logs")
    .update({ ended_at: new Date().toISOString(), resolved_by: staff.userId })
    .eq("id", downtimeId);

  if (error) return { error: error.message };

  revalidatePath(`/equipment/${equipmentId}`);
  revalidatePath("/equipment");
  revalidatePath("/dashboard");
  return { error: null };
}
