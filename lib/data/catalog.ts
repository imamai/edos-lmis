import { createClient } from "@/lib/supabase/server";

export type DepartmentRow = {
  id: string;
  code: string;
  name: string;
  department_type: string;
  default_tat_hours: number | null;
  is_active: boolean;
};

export async function getDepartments(): Promise<{ data: DepartmentRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("edoslmis_departments")
    .select("id, code, name, department_type, default_tat_hours, is_active")
    .order("sort_order")
    .order("name");
  if (error) return { data: [], error: error.message };
  return { data: data ?? [], error: null };
}

export async function getDepartment(id: string): Promise<DepartmentRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("edoslmis_departments")
    .select("id, code, name, department_type, default_tat_hours, is_active")
    .eq("id", id)
    .single();
  return data ?? null;
}

export type TestCategoryRow = { id: string; name: string };

export async function getTestCategories(): Promise<TestCategoryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("edoslmis_test_categories")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  return data ?? [];
}

export type SpecimenTypeRow = { id: string; code: string; name: string };

export async function getSpecimenTypes(): Promise<SpecimenTypeRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("edoslmis_specimen_types")
    .select("id, code, name")
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export type TestRow = {
  id: string;
  code: string;
  name: string;
  short_name: string | null;
  price: number;
  turnaround_time_hours: number | null;
  gender_applicability: string;
  is_active: boolean;
  department: { id: string; name: string } | null;
  category: { id: string; name: string } | null;
  specimen_type: { id: string; name: string } | null;
};

export async function getTests(): Promise<{ data: TestRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("edoslmis_tests")
    .select(
      "id, code, name, short_name, price, turnaround_time_hours, gender_applicability, is_active, edoslmis_departments(id, name), edoslmis_test_categories(id, name), edoslmis_specimen_types(id, name)"
    )
    .eq("is_panel", false)
    .order("name");
  if (error) return { data: [], error: error.message };
  return {
    data: (data ?? []).map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      short_name: t.short_name,
      price: Number(t.price),
      turnaround_time_hours: t.turnaround_time_hours,
      gender_applicability: t.gender_applicability,
      is_active: t.is_active,
      department: t.edoslmis_departments as unknown as { id: string; name: string } | null,
      category: t.edoslmis_test_categories as unknown as { id: string; name: string } | null,
      specimen_type: t.edoslmis_specimen_types as unknown as { id: string; name: string } | null,
    })),
    error: null,
  };
}

export type TestDetail = {
  id: string;
  code: string;
  name: string;
  short_name: string | null;
  department_id: string | null;
  category_id: string | null;
  specimen_type_id: string | null;
  price: number;
  turnaround_time_hours: number | null;
  gender_applicability: string;
  is_active: boolean;
};

export async function getTest(id: string): Promise<TestDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("edoslmis_tests")
    .select(
      "id, code, name, short_name, department_id, category_id, specimen_type_id, price, turnaround_time_hours, gender_applicability, is_active"
    )
    .eq("id", id)
    .single();
  if (!data) return null;
  return { ...data, price: Number(data.price) };
}

export type TestReagentUsageRow = {
  id: string;
  item_id: string;
  item_name: string;
  item_code: string;
  unit_of_measure: string;
  quantity_per_test: number;
};

export async function getTestReagentUsage(testId: string): Promise<TestReagentUsageRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("edoslmis_test_reagent_usage")
    .select("id, item_id, quantity_per_test, edoslmis_inventory_items(name, code, unit_of_measure)")
    .eq("test_id", testId)
    .order("created_at");

  return (data ?? []).map((row) => {
    const item = row.edoslmis_inventory_items as unknown as { name: string; code: string; unit_of_measure: string } | null;
    return {
      id: row.id,
      item_id: row.item_id,
      item_name: item?.name ?? "Unknown item",
      item_code: item?.code ?? "",
      unit_of_measure: item?.unit_of_measure ?? "unit",
      quantity_per_test: Number(row.quantity_per_test),
    };
  });
}

export type SelectOption = { value: string; critical: boolean };

export type TestComponentRow = {
  id: string;
  name: string;
  sequence: number;
  unit: string | null;
  dataType: "numeric" | "text" | "select";
  selectOptions: SelectOption[];
  low: number | null;
  high: number | null;
  textRange: string | null;
  criticalLow: number | null;
  criticalHigh: number | null;
};

export async function getTestComponents(testId: string): Promise<TestComponentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("edoslmis_test_components")
    .select(
      "id, name, sequence, unit, data_type, select_options, edoslmis_reference_ranges(low, high, text_range, critical_low, critical_high, gender)"
    )
    .eq("test_id", testId)
    .order("sequence");

  return (data ?? []).map((row) => {
    const ranges = (row.edoslmis_reference_ranges as unknown as
      | { low: number | null; high: number | null; text_range: string | null; critical_low: number | null; critical_high: number | null; gender: string }[]
      | null) ?? [];
    const range = ranges.find((r) => r.gender === "all") ?? ranges[0] ?? null;
    return {
      id: row.id,
      name: row.name,
      sequence: row.sequence,
      unit: row.unit,
      dataType: (row.data_type as TestComponentRow["dataType"]) ?? "numeric",
      selectOptions: Array.isArray(row.select_options) ? (row.select_options as SelectOption[]) : [],
      low: range?.low !== undefined && range?.low !== null ? Number(range.low) : null,
      high: range?.high !== undefined && range?.high !== null ? Number(range.high) : null,
      textRange: range?.text_range ?? null,
      criticalLow: range?.critical_low !== undefined && range?.critical_low !== null ? Number(range.critical_low) : null,
      criticalHigh: range?.critical_high !== undefined && range?.critical_high !== null ? Number(range.critical_high) : null,
    };
  });
}

export type PanelRow = {
  id: string;
  code: string;
  name: string;
  price: number;
  is_active: boolean;
  test_count: number;
};

export async function getPanels(): Promise<{ data: PanelRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("edoslmis_panels")
    .select("id, code, name, price, is_active, edoslmis_panel_tests(id)")
    .order("name");
  if (error) return { data: [], error: error.message };
  return {
    data: (data ?? []).map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      price: Number(p.price),
      is_active: p.is_active,
      test_count: (p.edoslmis_panel_tests as unknown[] | null)?.length ?? 0,
    })),
    error: null,
  };
}

export type PanelDetail = {
  id: string;
  code: string;
  name: string;
  price: number;
  is_active: boolean;
  test_ids: string[];
};

export async function getPanel(id: string): Promise<PanelDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("edoslmis_panels")
    .select("id, code, name, price, is_active, edoslmis_panel_tests(test_id)")
    .eq("id", id)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    code: data.code,
    name: data.name,
    price: Number(data.price),
    is_active: data.is_active,
    test_ids: (data.edoslmis_panel_tests as unknown as { test_id: string }[] | null)?.map((pt) => pt.test_id) ?? [],
  };
}
