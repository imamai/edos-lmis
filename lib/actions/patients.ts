"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createPatient(_prevState: { error: string } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: numberData, error: numberError } = await supabase.rpc(
    "edoslmis_generate_patient_number"
  );
  if (numberError) return { error: numberError.message };

  const payload = {
    tenant_id: staff.tenantId,
    branch_id: staff.branchId,
    patient_number: numberData as string,
    first_name: String(formData.get("first_name") ?? "").trim(),
    last_name: String(formData.get("last_name") ?? "").trim(),
    other_names: String(formData.get("other_names") ?? "").trim() || null,
    gender: String(formData.get("gender") ?? "") || null,
    date_of_birth: String(formData.get("date_of_birth") ?? "") || null,
    national_id: String(formData.get("national_id") ?? "").trim() || null,
    phone_primary: String(formData.get("phone_primary") ?? "").trim() || null,
    county: String(formData.get("county") ?? "").trim() || null,
    patient_category: String(formData.get("patient_category") ?? "walk_in"),
    next_of_kin_name: String(formData.get("next_of_kin_name") ?? "").trim() || null,
    next_of_kin_phone: String(formData.get("next_of_kin_phone") ?? "").trim() || null,
    registered_by: staff.userId,
    created_by: staff.userId,
  };

  if (!payload.first_name || !payload.last_name) {
    return { error: "First name and last name are required." };
  }

  const { data: patient, error } = await supabase
    .from("edoslmis_patients")
    .insert(payload)
    .select("id")
    .single();

  if (error) return { error: error.message };

  redirect(`/patients/${patient.id}`);
}

export async function updatePatient(_prevState: { error: string } | null, formData: FormData) {
  await getCurrentStaff();
  const supabase = await createClient();

  const patientId = String(formData.get("patient_id") ?? "");
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  if (!firstName || !lastName) return { error: "First name and last name are required." };

  const { error } = await supabase
    .from("edoslmis_patients")
    .update({
      first_name: firstName,
      last_name: lastName,
      other_names: String(formData.get("other_names") ?? "").trim() || null,
      gender: String(formData.get("gender") ?? "") || null,
      date_of_birth: String(formData.get("date_of_birth") ?? "") || null,
      national_id: String(formData.get("national_id") ?? "").trim() || null,
      phone_primary: String(formData.get("phone_primary") ?? "").trim() || null,
      county: String(formData.get("county") ?? "").trim() || null,
      patient_category: String(formData.get("patient_category") ?? "walk_in"),
      next_of_kin_name: String(formData.get("next_of_kin_name") ?? "").trim() || null,
      next_of_kin_phone: String(formData.get("next_of_kin_phone") ?? "").trim() || null,
    })
    .eq("id", patientId);

  if (error) return { error: error.message };

  redirect(`/patients/${patientId}`);
}

export async function deactivatePatient(patientId: string) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase
    .from("edoslmis_patients")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", patientId);

  if (error) return { error: error.message };

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/patients");
  return { error: null };
}
