"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createHistoCase(orderTestId: string, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: orderTest } = await supabase
    .from("edoslmis_order_tests")
    .select("specimen_id")
    .eq("id", orderTestId)
    .single();

  const { error } = await supabase.from("edoslmis_histo_cases").insert({
    tenant_id: staff.tenantId,
    branch_id: staff.branchId,
    order_test_id: orderTestId,
    specimen_id: orderTest?.specimen_id ?? null,
    specimen_type: String(formData.get("specimen_type") ?? "biopsy"),
    clinical_history: String(formData.get("clinical_history") ?? "").trim() || null,
    gross_description: String(formData.get("gross_description") ?? "").trim() || null,
    number_of_pieces: Number(formData.get("number_of_pieces") ?? 1),
    status: "grossed",
    created_by: staff.userId,
  });

  if (error) return { error: error.message };

  await supabase.from("edoslmis_order_tests").update({ status: "in_analysis" }).eq("id", orderTestId);

  revalidatePath(`/histopathology/${orderTestId}`);
  return { error: null };
}

export async function addBlock(orderTestId: string, formData: FormData) {
  const caseId = String(formData.get("case_id") ?? "");
  const blockNumber = String(formData.get("block_number") ?? "").trim();
  if (!caseId || !blockNumber) return { error: "Enter a block number." };

  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_histo_blocks").insert({
    tenant_id: staff.tenantId,
    case_id: caseId,
    block_number: blockNumber,
    tissue_description: String(formData.get("tissue_description") ?? "").trim() || null,
  });
  if (error) return { error: error.message };

  await supabase
    .from("edoslmis_histo_cases")
    .update({ status: "processing" })
    .eq("id", caseId)
    .eq("status", "grossed");

  revalidatePath(`/histopathology/${orderTestId}`);
  return { error: null };
}

export async function addSlide(orderTestId: string, formData: FormData) {
  const blockId = String(formData.get("block_id") ?? "");
  const caseId = String(formData.get("case_id") ?? "");
  const slideNumber = String(formData.get("slide_number") ?? "").trim();
  if (!blockId || !slideNumber) return { error: "Enter a slide number." };

  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_histo_slides").insert({
    tenant_id: staff.tenantId,
    block_id: blockId,
    slide_number: slideNumber,
    stain_type: String(formData.get("stain_type") ?? "H&E"),
  });
  if (error) return { error: error.message };

  await supabase
    .from("edoslmis_histo_cases")
    .update({ status: "microscopy" })
    .eq("id", caseId)
    .in("status", ["processing", "grossed"]);

  revalidatePath(`/histopathology/${orderTestId}`);
  return { error: null };
}

export async function finalizeDiagnosis(orderTestId: string, formData: FormData) {
  const caseId = String(formData.get("case_id") ?? "");
  const microscopicDescription = String(formData.get("microscopic_description") ?? "").trim();
  const diagnosis = String(formData.get("diagnosis") ?? "").trim();
  if (!caseId || !microscopicDescription || !diagnosis) {
    return { error: "Enter the microscopic description and diagnosis." };
  }

  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const icdOCode = String(formData.get("icd_o_code") ?? "").trim() || null;
  const marginsStatus = String(formData.get("margins_status") ?? "").trim() || null;

  const { error: diagError } = await supabase.from("edoslmis_histo_diagnoses").insert({
    tenant_id: staff.tenantId,
    case_id: caseId,
    microscopic_description: microscopicDescription,
    diagnosis,
    icd_o_code: icdOCode,
    margins_status: marginsStatus,
    signed_by: staff.userId,
  });
  if (diagError) return { error: diagError.message };

  await supabase.from("edoslmis_histo_cases").update({ status: "finalized" }).eq("id", caseId);

  const summary = `Diagnosis: ${diagnosis}${icdOCode ? ` (ICD-O ${icdOCode})` : ""}${marginsStatus ? `. Margins: ${marginsStatus}` : ""}.`;

  const { error: entryError } = await supabase.from("edoslmis_result_entries").insert({
    tenant_id: staff.tenantId,
    order_test_id: orderTestId,
    component_id: null,
    result_value_text: summary,
    flag: "normal",
    entered_by: staff.userId,
  });
  if (entryError) return { error: entryError.message };

  await supabase.from("edoslmis_order_tests").update({ status: "resulted" }).eq("id", orderTestId);

  revalidatePath(`/histopathology/${orderTestId}`);
  revalidatePath(`/results/${orderTestId}`);
  revalidatePath("/results");
  return { error: null };
}
