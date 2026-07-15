"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------
export async function createDepartment(_prevState: { error: string } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!code || !name) return { error: "Code and name are required." };

  const tatRaw = formData.get("default_tat_hours");
  const { error } = await supabase.from("edoslmis_departments").insert({
    tenant_id: staff.tenantId,
    branch_id: staff.branchId,
    code,
    name,
    department_type: String(formData.get("department_type") ?? "other"),
    default_tat_hours: tatRaw && String(tatRaw).trim() !== "" ? Number(tatRaw) : null,
    created_by: staff.userId,
  });
  if (error) return { error: error.message };

  redirect("/departments");
}

export async function updateDepartment(_prevState: { error: string } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const departmentId = String(formData.get("department_id") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!code || !name) return { error: "Code and name are required." };

  const tatRaw = formData.get("default_tat_hours");
  const { error } = await supabase
    .from("edoslmis_departments")
    .update({
      code,
      name,
      department_type: String(formData.get("department_type") ?? "other"),
      default_tat_hours: tatRaw && String(tatRaw).trim() !== "" ? Number(tatRaw) : null,
      updated_by: staff.userId,
    })
    .eq("id", departmentId);
  if (error) return { error: error.message };

  redirect("/departments");
}

export async function deleteDepartment(departmentId: string): Promise<{ error: string } | void> {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_departments").delete().eq("id", departmentId);
  if (error) {
    if (error.code === "23503") {
      return { error: "This department is linked to tests, equipment, or other records and can't be deleted — deactivate it instead." };
    }
    return { error: error.message };
  }

  revalidatePath("/departments");
}

export async function setDepartmentActive(departmentId: string, isActive: boolean) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase
    .from("edoslmis_departments")
    .update({ is_active: isActive })
    .eq("id", departmentId);
  if (error) return { error: error.message };

  revalidatePath("/departments");
  return { error: null };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
function parseTestFields(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const priceRaw = formData.get("price");
  const tatRaw = formData.get("turnaround_time_hours");
  return {
    code,
    name,
    short_name: String(formData.get("short_name") ?? "").trim() || null,
    department_id: String(formData.get("department_id") ?? "") || null,
    category_id: String(formData.get("category_id") ?? "") || null,
    specimen_type_id: String(formData.get("specimen_type_id") ?? "") || null,
    price: priceRaw && String(priceRaw).trim() !== "" ? Number(priceRaw) : 0,
    turnaround_time_hours: tatRaw && String(tatRaw).trim() !== "" ? Number(tatRaw) : null,
    gender_applicability: String(formData.get("gender_applicability") ?? "all"),
  };
}

export async function createTest(_prevState: { error: string } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const fields = parseTestFields(formData);
  if (!fields.code || !fields.name) return { error: "Code and name are required." };

  const { error } = await supabase.from("edoslmis_tests").insert({
    tenant_id: staff.tenantId,
    ...fields,
    is_panel: false,
    created_by: staff.userId,
  });
  if (error) return { error: error.message };

  redirect("/tests");
}

export async function updateTest(_prevState: { error: string } | null, formData: FormData) {
  await getCurrentStaff();
  const supabase = await createClient();

  const testId = String(formData.get("test_id") ?? "");
  const fields = parseTestFields(formData);
  if (!fields.code || !fields.name) return { error: "Code and name are required." };

  const { error } = await supabase.from("edoslmis_tests").update(fields).eq("id", testId);
  if (error) return { error: error.message };

  redirect("/tests");
}

export async function deleteTest(testId: string): Promise<{ error: string } | void> {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_tests").delete().eq("id", testId);
  if (error) {
    if (error.code === "23503") {
      return { error: "This test has been ordered, added to a panel, or otherwise referenced and can't be deleted — deactivate it instead." };
    }
    return { error: error.message };
  }

  revalidatePath("/tests");
}

export async function setTestActive(testId: string, isActive: boolean) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_tests").update({ is_active: isActive }).eq("id", testId);
  if (error) return { error: error.message };

  revalidatePath("/tests");
  return { error: null };
}

// ---------------------------------------------------------------------------
// Test -> inventory reagent consumption links
// ---------------------------------------------------------------------------
export async function addTestReagentUsage(
  _prevState: { error: string | null } | null,
  formData: FormData
) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const testId = String(formData.get("test_id") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  const quantity = Number(formData.get("quantity_per_test") ?? 0);

  if (!testId || !itemId || !quantity || quantity <= 0) {
    return { error: "Select an item and enter a quantity greater than zero." };
  }

  const { error } = await supabase.from("edoslmis_test_reagent_usage").insert({
    tenant_id: staff.tenantId,
    test_id: testId,
    item_id: itemId,
    quantity_per_test: quantity,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "This item is already linked to this test — edit the existing link instead." };
    }
    return { error: error.message };
  }

  revalidatePath(`/tests/${testId}/edit`);
  return { error: null };
}

export async function removeTestReagentUsage(usageId: string, testId: string) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_test_reagent_usage").delete().eq("id", usageId);
  if (error) return { error: error.message };

  revalidatePath(`/tests/${testId}/edit`);
  return { error: null };
}

// ---------------------------------------------------------------------------
// Test result components (drives the Enter Results form + reference ranges)
// ---------------------------------------------------------------------------
type SelectOption = { value: string; critical: boolean };

function parseTestComponentFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim() || null;
  const dataType = String(formData.get("data_type") ?? "numeric") as "numeric" | "text" | "select";

  const numOrNull = (key: string) => {
    const raw = formData.get(key);
    if (raw === null || String(raw).trim() === "") return null;
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
  };

  let low: number | null = null;
  let high: number | null = null;
  let textRange: string | null = null;
  let criticalLow: number | null = null;
  let criticalHigh: number | null = null;
  let selectOptions: SelectOption[] = [];

  if (dataType === "numeric") {
    low = numOrNull("low");
    high = numOrNull("high");
    criticalLow = numOrNull("critical_low");
    criticalHigh = numOrNull("critical_high");
  } else if (dataType === "text") {
    textRange = String(formData.get("text_range") ?? "").trim() || null;
  } else if (dataType === "select") {
    const raw = String(formData.get("select_options") ?? "");
    selectOptions = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const critical = line.endsWith("*");
        const value = critical ? line.slice(0, -1).trim() : line;
        return { value, critical };
      })
      .filter((o) => o.value.length > 0);
  }

  return { name, unit, dataType, low, high, textRange, criticalLow, criticalHigh, selectOptions };
}

export async function addTestComponent(_prevState: { error: string | null } | null, formData: FormData) {
  await getCurrentStaff();
  const supabase = await createClient();

  const testId = String(formData.get("test_id") ?? "");
  const fields = parseTestComponentFields(formData);
  if (!testId || !fields.name) return { error: "Enter a component name." };
  if (fields.dataType === "select" && fields.selectOptions.length === 0) {
    return { error: "Enter at least one option, one per line." };
  }

  const { count } = await supabase
    .from("edoslmis_test_components")
    .select("id", { count: "exact", head: true })
    .eq("test_id", testId);

  const { data: component, error } = await supabase
    .from("edoslmis_test_components")
    .insert({
      test_id: testId,
      name: fields.name,
      sequence: count ?? 0,
      unit: fields.unit,
      data_type: fields.dataType,
      select_options: fields.dataType === "select" ? fields.selectOptions : null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const { error: rangeError } = await supabase.from("edoslmis_reference_ranges").insert({
    test_id: testId,
    component_id: component.id,
    gender: "all",
    age_min_days: 0,
    low: fields.low,
    high: fields.high,
    text_range: fields.textRange,
    critical_low: fields.criticalLow,
    critical_high: fields.criticalHigh,
  });
  if (rangeError) {
    await supabase.from("edoslmis_test_components").delete().eq("id", component.id);
    return { error: rangeError.message };
  }

  revalidatePath(`/tests/${testId}/edit`);
  return { error: null };
}

export async function updateTestComponent(_prevState: { error: string | null } | null, formData: FormData) {
  await getCurrentStaff();
  const supabase = await createClient();

  const componentId = String(formData.get("component_id") ?? "");
  const testId = String(formData.get("test_id") ?? "");
  const fields = parseTestComponentFields(formData);
  if (!componentId || !testId || !fields.name) return { error: "Enter a component name." };
  if (fields.dataType === "select" && fields.selectOptions.length === 0) {
    return { error: "Enter at least one option, one per line." };
  }

  const { error } = await supabase
    .from("edoslmis_test_components")
    .update({
      name: fields.name,
      unit: fields.unit,
      data_type: fields.dataType,
      select_options: fields.dataType === "select" ? fields.selectOptions : null,
    })
    .eq("id", componentId);
  if (error) return { error: error.message };

  const { data: existingRange } = await supabase
    .from("edoslmis_reference_ranges")
    .select("id")
    .eq("component_id", componentId)
    .eq("gender", "all")
    .maybeSingle();

  const rangeFields = {
    low: fields.low,
    high: fields.high,
    text_range: fields.textRange,
    critical_low: fields.criticalLow,
    critical_high: fields.criticalHigh,
  };

  const { error: rangeError } = existingRange
    ? await supabase.from("edoslmis_reference_ranges").update(rangeFields).eq("id", existingRange.id)
    : await supabase.from("edoslmis_reference_ranges").insert({
        test_id: testId,
        component_id: componentId,
        gender: "all",
        age_min_days: 0,
        ...rangeFields,
      });
  if (rangeError) return { error: rangeError.message };

  revalidatePath(`/tests/${testId}/edit`);
  return { error: null };
}

export async function deleteTestComponent(componentId: string, testId: string) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_test_components").delete().eq("id", componentId);
  if (error) {
    if (error.code === "23503") {
      return { error: "This component has results recorded and can't be deleted — deactivate the test instead." };
    }
    return { error: error.message };
  }

  revalidatePath(`/tests/${testId}/edit`);
  return { error: null };
}

// ---------------------------------------------------------------------------
// Panels
// ---------------------------------------------------------------------------
export async function createPanel(_prevState: { error: string } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const testIds = formData.getAll("test_id").map(String);
  if (!code || !name) return { error: "Code and name are required." };
  if (testIds.length === 0) return { error: "Select at least one test for this panel." };

  const priceRaw = formData.get("price");
  const { data: panel, error } = await supabase
    .from("edoslmis_panels")
    .insert({
      tenant_id: staff.tenantId,
      code,
      name,
      price: priceRaw && String(priceRaw).trim() !== "" ? Number(priceRaw) : 0,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const { error: linkError } = await supabase.from("edoslmis_panel_tests").insert(
    testIds.map((testId, i) => ({ panel_id: panel.id, test_id: testId, sequence: i }))
  );
  if (linkError) return { error: linkError.message };

  redirect("/tests");
}

export async function updatePanel(_prevState: { error: string } | null, formData: FormData) {
  await getCurrentStaff();
  const supabase = await createClient();

  const panelId = String(formData.get("panel_id") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const testIds = formData.getAll("test_id").map(String);
  if (!code || !name) return { error: "Code and name are required." };
  if (testIds.length === 0) return { error: "Select at least one test for this panel." };

  const priceRaw = formData.get("price");
  const { error } = await supabase
    .from("edoslmis_panels")
    .update({ code, name, price: priceRaw && String(priceRaw).trim() !== "" ? Number(priceRaw) : 0 })
    .eq("id", panelId);
  if (error) return { error: error.message };

  const { error: deleteError } = await supabase.from("edoslmis_panel_tests").delete().eq("panel_id", panelId);
  if (deleteError) return { error: deleteError.message };

  const { error: linkError } = await supabase.from("edoslmis_panel_tests").insert(
    testIds.map((testId, i) => ({ panel_id: panelId, test_id: testId, sequence: i }))
  );
  if (linkError) return { error: linkError.message };

  redirect("/tests");
}

export async function deletePanel(panelId: string): Promise<{ error: string } | void> {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_panels").delete().eq("id", panelId);
  if (error) {
    if (error.code === "23503") {
      return { error: "This panel has been ordered and can't be deleted — deactivate it instead." };
    }
    return { error: error.message };
  }

  revalidatePath("/tests");
}

export async function setPanelActive(panelId: string, isActive: boolean) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_panels").update({ is_active: isActive }).eq("id", panelId);
  if (error) return { error: error.message };

  revalidatePath("/tests");
  return { error: null };
}
