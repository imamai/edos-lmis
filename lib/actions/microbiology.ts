"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createOrganism(_prevState: { error: string | null } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter an organism name." };

  const { error } = await supabase.from("edoslmis_micro_organisms").insert({
    tenant_id: staff.tenantId,
    name,
    gram_stain: String(formData.get("gram_stain") ?? "not_applicable"),
  });
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: null };
}

export async function setOrganismActive(organismId: string, isActive: boolean) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase
    .from("edoslmis_micro_organisms")
    .update({ is_active: isActive })
    .eq("id", organismId);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: null };
}

export async function createAntibiotic(_prevState: { error: string | null } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Enter an antibiotic name." };

  const { error } = await supabase.from("edoslmis_micro_antibiotics").insert({
    tenant_id: staff.tenantId,
    name,
    antibiotic_class: String(formData.get("antibiotic_class") ?? "").trim() || null,
  });
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: null };
}

export async function setAntibioticActive(antibioticId: string, isActive: boolean) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase
    .from("edoslmis_micro_antibiotics")
    .update({ is_active: isActive })
    .eq("id", antibioticId);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: null };
}

export async function createCulture(orderTestId: string, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: orderTest } = await supabase
    .from("edoslmis_order_tests")
    .select("specimen_id")
    .eq("id", orderTestId)
    .single();

  const { error } = await supabase.from("edoslmis_micro_cultures").insert({
    tenant_id: staff.tenantId,
    branch_id: staff.branchId,
    order_test_id: orderTestId,
    specimen_id: orderTest?.specimen_id ?? null,
    culture_type: String(formData.get("culture_type") ?? "aerobic"),
    media_used: String(formData.get("media_used") ?? "").trim() || null,
    gram_stain_result: String(formData.get("gram_stain_result") ?? "").trim() || null,
    created_by: staff.userId,
  });

  if (error) return { error: error.message };

  await supabase.from("edoslmis_order_tests").update({ status: "in_analysis" }).eq("id", orderTestId);

  revalidatePath(`/microbiology/${orderTestId}`);
  return { error: null };
}

export async function setCultureGrowth(cultureId: string, orderTestId: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("edoslmis_micro_cultures")
    .update({ status })
    .eq("id", cultureId);
  if (error) return { error: error.message };

  revalidatePath(`/microbiology/${orderTestId}`);
  return { error: null };
}

export async function addIsolate(orderTestId: string, formData: FormData) {
  const cultureId = String(formData.get("culture_id") ?? "");
  const organismId = String(formData.get("organism_id") ?? "");
  if (!cultureId || !organismId) return { error: "Select an organism." };

  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_micro_culture_isolates").insert({
    tenant_id: staff.tenantId,
    culture_id: cultureId,
    organism_id: organismId,
    colony_count: String(formData.get("colony_count") ?? "").trim() || null,
    significance: String(formData.get("significance") ?? "pathogen"),
  });

  if (error) return { error: error.message };

  revalidatePath(`/microbiology/${orderTestId}`);
  return { error: null };
}

export async function addSensitivityResult(orderTestId: string, formData: FormData) {
  const isolateId = String(formData.get("isolate_id") ?? "");
  const antibioticId = String(formData.get("antibiotic_id") ?? "");
  const interpretation = String(formData.get("interpretation") ?? "");
  if (!isolateId || !antibioticId || !interpretation) {
    return { error: "Select an isolate, antibiotic, and interpretation." };
  }

  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const zoneDiameter = formData.get("zone_diameter_mm") ? Number(formData.get("zone_diameter_mm")) : null;

  const { error } = await supabase.from("edoslmis_micro_sensitivity_results").insert({
    tenant_id: staff.tenantId,
    isolate_id: isolateId,
    antibiotic_id: antibioticId,
    method: String(formData.get("method") ?? "disc_diffusion"),
    zone_diameter_mm: zoneDiameter,
    interpretation,
  });

  if (error) return { error: error.message };

  revalidatePath(`/microbiology/${orderTestId}`);
  return { error: null };
}

export async function finalizeCulture(cultureId: string, orderTestId: string) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: culture } = await supabase
    .from("edoslmis_micro_cultures")
    .select("id, status, gram_stain_result")
    .eq("id", cultureId)
    .single();
  if (!culture) return { error: "Culture not found." };

  const { data: isolates } = await supabase
    .from("edoslmis_micro_culture_isolates")
    .select("id, colony_count, significance, edoslmis_micro_organisms(name)")
    .eq("culture_id", cultureId);

  let summary: string;
  if (culture.status === "no_growth" || (isolates?.length ?? 0) === 0) {
    summary = "No growth after 48 hours of incubation.";
  } else {
    const parts: string[] = [];
    for (const isolate of isolates ?? []) {
      const organism = isolate.edoslmis_micro_organisms as unknown as { name: string } | null;
      const { data: sensitivities } = await supabase
        .from("edoslmis_micro_sensitivity_results")
        .select("interpretation, edoslmis_micro_antibiotics(name)")
        .eq("isolate_id", isolate.id);

      const sensLine = (sensitivities ?? [])
        .map((s) => {
          const abx = s.edoslmis_micro_antibiotics as unknown as { name: string } | null;
          const code =
            ({ susceptible: "S", intermediate: "I", resistant: "R" } as Record<string, string>)[s.interpretation] ??
            s.interpretation;
          return `${abx?.name}: ${code}`;
        })
        .join(", ");

      parts.push(
        `${organism?.name ?? "Unidentified organism"}${isolate.colony_count ? ` (${isolate.colony_count})` : ""} — ${isolate.significance}` +
          (sensLine ? `. Sensitivity: ${sensLine}.` : ".")
      );
    }
    summary = parts.join(" ");
  }

  if (culture.gram_stain_result) {
    summary = `Gram stain: ${culture.gram_stain_result}. Culture: ${summary}`;
  }

  const { error: entryError } = await supabase.from("edoslmis_result_entries").insert({
    tenant_id: staff.tenantId,
    order_test_id: orderTestId,
    component_id: null,
    result_value_text: summary,
    flag: "normal",
    entered_by: staff.userId,
  });
  if (entryError) return { error: entryError.message };

  await supabase
    .from("edoslmis_micro_cultures")
    .update({ status: "finalized", finalized_by: staff.userId, finalized_at: new Date().toISOString() })
    .eq("id", cultureId);

  await supabase.from("edoslmis_order_tests").update({ status: "resulted" }).eq("id", orderTestId);

  revalidatePath(`/microbiology/${orderTestId}`);
  revalidatePath(`/results/${orderTestId}`);
  revalidatePath("/results");
  return { error: null };
}
