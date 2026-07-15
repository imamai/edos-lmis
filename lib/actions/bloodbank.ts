"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createDonor(_prevState: { error: string } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  if (!firstName || !lastName) return { error: "First name and last name are required." };

  const { data: donorNumber, error: numberError } = await supabase.rpc("edoslmis_generate_donor_number");
  if (numberError) return { error: numberError.message };

  const { error } = await supabase.from("edoslmis_bb_donors").insert({
    tenant_id: staff.tenantId,
    branch_id: staff.branchId,
    donor_number: donorNumber as string,
    first_name: firstName,
    last_name: lastName,
    gender: String(formData.get("gender") ?? "") || null,
    date_of_birth: String(formData.get("date_of_birth") ?? "") || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    national_id: String(formData.get("national_id") ?? "").trim() || null,
    donor_type: String(formData.get("donor_type") ?? "voluntary"),
    blood_group: String(formData.get("blood_group") ?? "") || null,
    created_by: staff.userId,
  });

  if (error) return { error: error.message };

  revalidatePath("/blood-bank/donors");
  redirect("/blood-bank/donors");
}

export async function updateDonor(_prevState: { error: string } | null, formData: FormData) {
  await getCurrentStaff();
  const supabase = await createClient();

  const donorId = String(formData.get("donor_id") ?? "");
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  if (!firstName || !lastName) return { error: "First name and last name are required." };

  const { error } = await supabase
    .from("edoslmis_bb_donors")
    .update({
      first_name: firstName,
      last_name: lastName,
      gender: String(formData.get("gender") ?? "") || null,
      date_of_birth: String(formData.get("date_of_birth") ?? "") || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      national_id: String(formData.get("national_id") ?? "").trim() || null,
      donor_type: String(formData.get("donor_type") ?? "voluntary"),
      blood_group: String(formData.get("blood_group") ?? "") || null,
    })
    .eq("id", donorId);

  if (error) return { error: error.message };

  redirect(`/blood-bank/donors/${donorId}`);
}

export async function deleteDonor(donorId: string) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_bb_donors").delete().eq("id", donorId);
  if (error) {
    if (error.code === "23503") {
      return { error: "This donor has recorded blood donations and can't be deleted — deactivate them instead." };
    }
    return { error: error.message };
  }

  revalidatePath("/blood-bank/donors");
  redirect("/blood-bank/donors");
}

export async function setDonorActive(donorId: string, isActive: boolean) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase
    .from("edoslmis_bb_donors")
    .update({ is_active: isActive })
    .eq("id", donorId);

  if (error) return { error: error.message };

  revalidatePath(`/blood-bank/donors/${donorId}`);
  revalidatePath("/blood-bank/donors");
  return { error: null };
}

export async function createBloodUnit(_prevState: { error: string } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const bloodGroup = String(formData.get("blood_group") ?? "");
  const expiryDate = String(formData.get("expiry_date") ?? "");
  if (!bloodGroup || !expiryDate) return { error: "Blood group and expiry date are required." };

  const { data: unitNumber, error: numberError } = await supabase.rpc("edoslmis_generate_blood_unit_number");
  if (numberError) return { error: numberError.message };

  const { error } = await supabase.from("edoslmis_bb_blood_units").insert({
    tenant_id: staff.tenantId,
    branch_id: staff.branchId,
    unit_number: unitNumber as string,
    donor_id: String(formData.get("donor_id") ?? "") || null,
    blood_group: bloodGroup,
    component: String(formData.get("component") ?? "whole_blood"),
    volume_ml: Number(formData.get("volume_ml") ?? 450),
    collection_date: String(formData.get("collection_date") ?? "") || undefined,
    expiry_date: expiryDate,
    status: "quarantine",
    created_by: staff.userId,
  });

  if (error) return { error: error.message };

  revalidatePath("/blood-bank/units");
  redirect("/blood-bank/units");
}

export async function releaseFromQuarantine(unitId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("edoslmis_bb_blood_units")
    .update({
      status: "available",
      screening_hiv: "non_reactive",
      screening_hbsag: "non_reactive",
      screening_hcv: "non_reactive",
      screening_syphilis: "non_reactive",
    })
    .eq("id", unitId)
    .eq("status", "quarantine");
  if (error) return { error: error.message };

  revalidatePath("/blood-bank/units");
  return { error: null };
}

export async function createCrossmatchRequest(
  _prevState: { error: string } | null,
  formData: FormData
) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const patientId = String(formData.get("patient_id") ?? "");
  if (!patientId) return { error: "Select a patient." };

  const { data: request, error } = await supabase
    .from("edoslmis_bb_crossmatch_requests")
    .insert({
      tenant_id: staff.tenantId,
      branch_id: staff.branchId,
      patient_id: patientId,
      patient_blood_group: String(formData.get("patient_blood_group") ?? "") || null,
      component_requested: String(formData.get("component_requested") ?? "packed_red_cells"),
      units_requested: Number(formData.get("units_requested") ?? 1),
      indication: String(formData.get("indication") ?? "").trim() || null,
      requested_by: staff.userId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  redirect(`/blood-bank/crossmatch/${request.id}`);
}

export async function recordCrossmatchResult(
  _prevState: { error: string | null } | null,
  formData: FormData
) {
  const requestId = String(formData.get("crossmatch_request_id") ?? "");
  const bloodUnitId = String(formData.get("blood_unit_id") ?? "");
  const result = String(formData.get("result") ?? "");
  const method = String(formData.get("method") ?? "gel");
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!requestId || !bloodUnitId || !result) return { error: "Select a unit and record a result." };

  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_bb_crossmatch_results").insert({
    tenant_id: staff.tenantId,
    crossmatch_request_id: requestId,
    blood_unit_id: bloodUnitId,
    method,
    result,
    performed_by: staff.userId,
    notes,
  });

  if (error) return { error: error.message };

  revalidatePath(`/blood-bank/crossmatch/${requestId}`);
  return { error: null };
}

export async function issueTransfusion(
  _prevState: { error: string | null } | null,
  formData: FormData
) {
  const crossmatchResultId = String(formData.get("crossmatch_result_id") ?? "");
  const bloodUnitId = String(formData.get("blood_unit_id") ?? "");
  const patientId = String(formData.get("patient_id") ?? "");
  const requestId = String(formData.get("crossmatch_request_id") ?? "");
  const wardLocation = String(formData.get("ward_location") ?? "").trim() || null;

  if (!bloodUnitId || !patientId) return { error: "Missing unit or patient." };

  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_bb_transfusions").insert({
    tenant_id: staff.tenantId,
    branch_id: staff.branchId,
    crossmatch_result_id: crossmatchResultId || null,
    blood_unit_id: bloodUnitId,
    patient_id: patientId,
    ward_location: wardLocation,
    issued_by: staff.userId,
  });

  if (error) return { error: error.message };

  revalidatePath(`/blood-bank/crossmatch/${requestId}`);
  revalidatePath("/blood-bank/units");
  return { error: null };
}

export async function reportTransfusionReaction(
  _prevState: { error: string | null } | null,
  formData: FormData
) {
  const transfusionId = String(formData.get("transfusion_id") ?? "");
  const reactionType = String(formData.get("reaction_type") ?? "").trim();
  if (!transfusionId || !reactionType) return { error: "Enter the reaction type." };

  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_bb_transfusion_reactions").insert({
    tenant_id: staff.tenantId,
    transfusion_id: transfusionId,
    reaction_type: reactionType,
    severity: String(formData.get("severity") ?? "mild"),
    symptoms: String(formData.get("symptoms") ?? "").trim() || null,
    action_taken: String(formData.get("action_taken") ?? "").trim() || null,
    reported_by: staff.userId,
  });

  if (error) return { error: error.message };

  await supabase
    .from("edoslmis_bb_transfusions")
    .update({ status: "discontinued" })
    .eq("id", transfusionId);

  revalidatePath("/blood-bank");
  return { error: null };
}
