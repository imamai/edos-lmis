"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function updateQcMaterial(_prevState: { error: string } | null, formData: FormData) {
  const materialId = String(formData.get("material_id") ?? "");
  const lotNumber = String(formData.get("lot_number") ?? "").trim();
  const targetMean = Number(formData.get("target_mean") ?? NaN);
  const targetSd = Number(formData.get("target_sd") ?? NaN);

  if (!materialId || !lotNumber) return { error: "Enter a lot number." };
  if (Number.isNaN(targetMean) || Number.isNaN(targetSd) || targetSd <= 0) {
    return { error: "Enter a valid target mean and a positive target SD." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("edoslmis_qc_materials")
    .update({
      lot_number: lotNumber,
      manufacturer: String(formData.get("manufacturer") ?? "").trim() || null,
      expiry_date: String(formData.get("expiry_date") ?? "") || null,
      target_mean: targetMean,
      target_sd: targetSd,
      unit: String(formData.get("unit") ?? "").trim() || null,
    })
    .eq("id", materialId);

  if (error) return { error: error.message };

  revalidatePath(`/qc/${materialId}`);
  revalidatePath("/qc");
  redirect(`/qc/${materialId}`);
}

export async function createQcMaterial(_prevState: { error: string } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const testId = String(formData.get("test_id") ?? "");
  const lotNumber = String(formData.get("lot_number") ?? "").trim();
  const targetMean = Number(formData.get("target_mean") ?? NaN);
  const targetSd = Number(formData.get("target_sd") ?? NaN);

  if (!testId || !lotNumber) return { error: "Select a test and enter a lot number." };
  if (Number.isNaN(targetMean) || Number.isNaN(targetSd) || targetSd <= 0) {
    return { error: "Enter a valid target mean and a positive target SD." };
  }

  const { data: material, error } = await supabase
    .from("edoslmis_qc_materials")
    .insert({
      tenant_id: staff.tenantId,
      branch_id: staff.branchId,
      test_id: testId,
      level: String(formData.get("level") ?? "level1"),
      lot_number: lotNumber,
      manufacturer: String(formData.get("manufacturer") ?? "").trim() || null,
      expiry_date: String(formData.get("expiry_date") ?? "") || null,
      target_mean: targetMean,
      target_sd: targetSd,
      unit: String(formData.get("unit") ?? "").trim() || null,
      created_by: staff.userId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  redirect(`/qc/${material.id}`);
}

export async function setQcMaterialActive(materialId: string, isActive: boolean) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase
    .from("edoslmis_qc_materials")
    .update({ is_active: isActive })
    .eq("id", materialId);
  if (error) return { error: error.message };

  revalidatePath(`/qc/${materialId}`);
  revalidatePath("/qc");
  return { error: null };
}

export async function logQcRun(
  _prevState: { error: string | null } | null,
  formData: FormData
) {
  const materialId = String(formData.get("material_id") ?? "");
  const value = Number(formData.get("value") ?? NaN);
  const comments = String(formData.get("comments") ?? "").trim() || null;
  const equipmentId = String(formData.get("equipment_id") ?? "").trim() || null;

  if (!materialId || Number.isNaN(value)) return { error: "Enter a valid control value." };

  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_qc_runs").insert({
    tenant_id: staff.tenantId,
    branch_id: staff.branchId,
    material_id: materialId,
    equipment_id: equipmentId,
    value,
    comments,
    performed_by: staff.userId,
  });

  if (error) return { error: error.message };

  revalidatePath(`/qc/${materialId}`);
  revalidatePath("/qc");
  revalidatePath("/dashboard");
  if (equipmentId) revalidatePath(`/equipment/${equipmentId}`);
  return { error: null };
}
