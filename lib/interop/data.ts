import { createClient } from "@/lib/supabase/server";
import { testInterpretation } from "@/lib/pdf/interpretation";

export type ReleasedResultData = {
  orderTestId: string;
  testName: string;
  testCode: string;
  orderNumber: string;
  orderedAt: string;
  releasedAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    patientNumber: string;
    gender: string | null;
    dateOfBirth: string | null;
  };
  results: {
    componentName: string;
    valueNumeric: number | null;
    valueText: string | null;
    unit: string | null;
    flag: string | null;
    referenceRange: string | null;
  }[];
  interpretation: string;
};

export async function getReleasedResultData(orderTestId: string): Promise<ReleasedResultData | null> {
  const supabase = await createClient();

  const { data: orderTest } = await supabase
    .from("edoslmis_order_tests")
    .select(
      "id, status, test_id, edoslmis_tests(name, code), edoslmis_orders(order_number, ordered_at, edoslmis_patients(id, first_name, last_name, patient_number, gender, date_of_birth))"
    )
    .eq("id", orderTestId)
    .single();

  if (!orderTest || orderTest.status !== "released") return null;

  const test = orderTest.edoslmis_tests as unknown as { name: string; code: string } | null;
  const order = orderTest.edoslmis_orders as unknown as {
    order_number: string;
    ordered_at: string;
    edoslmis_patients: {
      id: string; first_name: string; last_name: string; patient_number: string;
      gender: string | null; date_of_birth: string | null;
    } | null;
  } | null;
  const patient = order?.edoslmis_patients;
  if (!patient) return null;

  const { data: release } = await supabase
    .from("edoslmis_result_release")
    .select("released_at")
    .eq("order_test_id", orderTestId)
    .single();

  const { data: components } = await supabase
    .from("edoslmis_test_components")
    .select("id, name")
    .eq("test_id", orderTest.test_id)
    .order("sequence");

  const { data: results } = await supabase
    .from("edoslmis_result_entries")
    .select("component_id, result_value_numeric, result_value_text, unit, flag")
    .eq("order_test_id", orderTestId);

  const { data: ranges } = await supabase
    .from("edoslmis_reference_ranges")
    .select("component_id, low, high, text_range")
    .eq("test_id", orderTest.test_id);

  const componentName = (componentId: string | null) =>
    components?.find((c) => c.id === componentId)?.name ?? test?.name ?? "Result";
  const referenceRangeFor = (componentId: string | null) => {
    const range = ranges?.find((r) => r.component_id === componentId);
    if (!range) return null;
    if (range.text_range) return range.text_range;
    if (range.low !== null && range.high !== null) return `${range.low} - ${range.high}`;
    return null;
  };

  const mappedResults = (results ?? []).map((r) => ({
    componentName: componentName(r.component_id),
    valueNumeric: r.result_value_numeric === null ? null : Number(r.result_value_numeric),
    valueText: r.result_value_text,
    unit: r.unit,
    flag: r.flag,
    referenceRange: referenceRangeFor(r.component_id),
  }));

  return {
    orderTestId,
    testName: test?.name ?? "",
    testCode: test?.code ?? "",
    orderNumber: order?.order_number ?? "",
    orderedAt: order?.ordered_at ?? "",
    releasedAt: release?.released_at ?? "",
    patient: {
      id: patient.id,
      firstName: patient.first_name,
      lastName: patient.last_name,
      patientNumber: patient.patient_number,
      gender: patient.gender,
      dateOfBirth: patient.date_of_birth,
    },
    results: mappedResults,
    interpretation: testInterpretation(mappedResults),
  };
}

export type OrderReportComponentResult = {
  componentName: string;
  valueNumeric: number | null;
  valueText: string | null;
  unit: string | null;
  flag: string | null;
  referenceRange: string | null;
};

export type OrderReportTestSection = {
  orderTestId: string;
  testName: string;
  testCode: string;
  releasedAt: string;
  results: OrderReportComponentResult[];
  interpretation: string;
};

export type ReleasedOrderReportData = {
  orderId: string;
  orderNumber: string;
  orderedAt: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    patientNumber: string;
    gender: string | null;
    dateOfBirth: string | null;
  };
  tests: OrderReportTestSection[];
};

export async function getReleasedOrderReportData(orderId: string): Promise<ReleasedOrderReportData | null> {
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("edoslmis_orders")
    .select(
      "id, order_number, ordered_at, edoslmis_patients(id, first_name, last_name, patient_number, gender, date_of_birth)"
    )
    .eq("id", orderId)
    .single();

  const patient = order?.edoslmis_patients as unknown as {
    id: string; first_name: string; last_name: string; patient_number: string;
    gender: string | null; date_of_birth: string | null;
  } | null;
  if (!order || !patient) return null;

  const { data: releasedOrderTests } = await supabase
    .from("edoslmis_order_tests")
    .select("id, test_id, edoslmis_tests(name, code)")
    .eq("order_id", orderId)
    .eq("status", "released")
    .order("created_at");

  if (!releasedOrderTests || releasedOrderTests.length === 0) return null;

  const orderTestIds = releasedOrderTests.map((ot) => ot.id);
  const testIds = [...new Set(releasedOrderTests.map((ot) => ot.test_id))];

  const [{ data: releases }, { data: components }, { data: results }, { data: ranges }] = await Promise.all([
    supabase.from("edoslmis_result_release").select("order_test_id, released_at").in("order_test_id", orderTestIds),
    supabase.from("edoslmis_test_components").select("id, test_id, name").in("test_id", testIds).order("sequence"),
    supabase
      .from("edoslmis_result_entries")
      .select("order_test_id, component_id, result_value_numeric, result_value_text, unit, flag")
      .in("order_test_id", orderTestIds),
    supabase.from("edoslmis_reference_ranges").select("test_id, component_id, low, high, text_range").in("test_id", testIds),
  ]);

  const componentName = (testId: string, componentId: string | null, fallback: string) =>
    components?.find((c) => c.id === componentId && c.test_id === testId)?.name ?? fallback;
  const referenceRangeFor = (testId: string, componentId: string | null) => {
    const range = ranges?.find((r) => r.test_id === testId && r.component_id === componentId);
    if (!range) return null;
    if (range.text_range) return range.text_range;
    if (range.low !== null && range.high !== null) return `${range.low} - ${range.high}`;
    return null;
  };

  const tests: OrderReportTestSection[] = releasedOrderTests.map((ot) => {
    const test = ot.edoslmis_tests as unknown as { name: string; code: string } | null;
    const testResults = (results ?? [])
      .filter((r) => r.order_test_id === ot.id)
      .map((r) => ({
        componentName: componentName(ot.test_id, r.component_id, test?.name ?? "Result"),
        valueNumeric: r.result_value_numeric === null ? null : Number(r.result_value_numeric),
        valueText: r.result_value_text,
        unit: r.unit,
        flag: r.flag,
        referenceRange: referenceRangeFor(ot.test_id, r.component_id),
      }));

    return {
      orderTestId: ot.id,
      testName: test?.name ?? "",
      testCode: test?.code ?? "",
      releasedAt: releases?.find((rel) => rel.order_test_id === ot.id)?.released_at ?? "",
      results: testResults,
      interpretation: testInterpretation(testResults),
    };
  });

  return {
    orderId: order.id,
    orderNumber: order.order_number,
    orderedAt: order.ordered_at,
    patient: {
      id: patient.id,
      firstName: patient.first_name,
      lastName: patient.last_name,
      patientNumber: patient.patient_number,
      gender: patient.gender,
      dateOfBirth: patient.date_of_birth,
    },
    tests,
  };
}
