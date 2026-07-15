"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createMolecularRun(orderTestId: string, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: orderTest } = await supabase
    .from("edoslmis_order_tests")
    .select("specimen_id")
    .eq("id", orderTestId)
    .single();

  const assayName = String(formData.get("assay_name") ?? "").trim();
  if (!assayName) return { error: "Enter the assay name." };

  const { error } = await supabase.from("edoslmis_molecular_runs").insert({
    tenant_id: staff.tenantId,
    branch_id: staff.branchId,
    order_test_id: orderTestId,
    specimen_id: orderTest?.specimen_id ?? null,
    equipment_id: String(formData.get("equipment_id") ?? "") || null,
    assay_name: assayName,
    performed_by: staff.userId,
    created_by: staff.userId,
  });

  if (error) return { error: error.message };

  await supabase.from("edoslmis_order_tests").update({ status: "in_analysis" }).eq("id", orderTestId);

  revalidatePath(`/molecular/${orderTestId}`);
  return { error: null };
}

export async function addMolecularTarget(orderTestId: string, formData: FormData) {
  const runId = String(formData.get("run_id") ?? "");
  const targetName = String(formData.get("target_name") ?? "").trim();
  const result = String(formData.get("result") ?? "");
  if (!runId || !targetName || !result) return { error: "Enter target name and result." };

  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const ctValue = formData.get("ct_value") ? Number(formData.get("ct_value")) : null;

  const { error } = await supabase.from("edoslmis_molecular_targets").insert({
    tenant_id: staff.tenantId,
    run_id: runId,
    target_name: targetName,
    ct_value: ctValue,
    result,
  });

  if (error) return { error: error.message };

  revalidatePath(`/molecular/${orderTestId}`);
  return { error: null };
}

export async function finalizeMolecularRun(runId: string, orderTestId: string) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: run } = await supabase
    .from("edoslmis_molecular_runs")
    .select("assay_name")
    .eq("id", runId)
    .single();
  if (!run) return { error: "Run not found." };

  const { data: targets } = await supabase
    .from("edoslmis_molecular_targets")
    .select("target_name, ct_value, result")
    .eq("run_id", runId);

  if (!targets || targets.length === 0) return { error: "Add at least one target result first." };

  const isControl = (name: string) => /control/i.test(name);
  const pathogenTargets = targets.filter((t) => !isControl(t.target_name));
  const overall = pathogenTargets.some((t) => t.result === "detected")
    ? "DETECTED"
    : pathogenTargets.every((t) => t.result === "not_detected")
      ? "NOT DETECTED"
      : "INDETERMINATE";

  const targetLines = targets
    .map((t) => `${t.target_name}: ${t.result.replace("_", " ")}${t.ct_value ? ` (Ct ${t.ct_value})` : ""}`)
    .join("; ");

  const summary = `${run.assay_name} — ${targetLines}. Overall: ${overall}.`;

  const { error: entryError } = await supabase.from("edoslmis_result_entries").insert({
    tenant_id: staff.tenantId,
    order_test_id: orderTestId,
    component_id: null,
    result_value_text: summary,
    flag: overall === "DETECTED" ? "abnormal" : "normal",
    is_critical: false,
    entered_by: staff.userId,
  });
  if (entryError) return { error: entryError.message };

  await supabase
    .from("edoslmis_molecular_runs")
    .update({ status: "completed", finalized_by: staff.userId, finalized_at: new Date().toISOString() })
    .eq("id", runId);

  await supabase.from("edoslmis_order_tests").update({ status: "resulted" }).eq("id", orderTestId);

  revalidatePath(`/molecular/${orderTestId}`);
  revalidatePath(`/results/${orderTestId}`);
  revalidatePath("/results");
  return { error: null };
}
