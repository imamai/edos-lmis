import { createClient } from "@/lib/supabase/server";
import { CultureWorkup } from "@/components/culture-workup";
import { notFound } from "next/navigation";

export default async function MicrobiologyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: orderTest, error: orderTestError } = await supabase
    .from("edoslmis_order_tests")
    .select(
      "id, status, edoslmis_tests(name), edoslmis_orders(order_number, edoslmis_patients(first_name, last_name, patient_number))"
    )
    .eq("id", id)
    .single();

  if (orderTestError) {
    return (
      <div className="space-y-6">
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{orderTestError.message}</p>
      </div>
    );
  }
  if (!orderTest) notFound();

  const test = orderTest.edoslmis_tests as unknown as { name: string } | null;
  const order = orderTest.edoslmis_orders as unknown as {
    order_number: string;
    edoslmis_patients: { first_name: string; last_name: string; patient_number: string } | null;
  } | null;
  const patient = order?.edoslmis_patients;

  const { data: culture } = await supabase
    .from("edoslmis_micro_cultures")
    .select("id, culture_type, status, media_used, gram_stain_result")
    .eq("order_test_id", id)
    .maybeSingle();

  const [{ data: isolates }, { data: organisms }, { data: antibiotics }] = await Promise.all([
    culture
      ? supabase
          .from("edoslmis_micro_culture_isolates")
          .select("id, colony_count, significance, edoslmis_micro_organisms(name)")
          .eq("culture_id", culture.id)
      : Promise.resolve({ data: [] }),
    supabase.from("edoslmis_micro_organisms").select("id, name").eq("is_active", true).order("name"),
    supabase.from("edoslmis_micro_antibiotics").select("id, name").eq("is_active", true).order("name"),
  ]);

  const sensitivitiesByIsolate: Record<string, { id: string; interpretation: string; zone_diameter_mm: number | null; edoslmis_micro_antibiotics: { name: string } | null }[]> = {};
  for (const isolate of isolates ?? []) {
    const { data: sens } = await supabase
      .from("edoslmis_micro_sensitivity_results")
      .select("id, interpretation, zone_diameter_mm, edoslmis_micro_antibiotics(name)")
      .eq("isolate_id", isolate.id);
    sensitivitiesByIsolate[isolate.id] = (sens ?? []) as unknown as typeof sensitivitiesByIsolate[string];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{test?.name} — Culture & Sensitivity</h1>
        <p className="text-sm text-muted-foreground">
          {order?.order_number} &middot; {patient ? `${patient.first_name} ${patient.last_name}` : "-"} ({patient?.patient_number})
        </p>
      </div>

      <CultureWorkup
        orderTestId={id}
        culture={culture ?? null}
        isolates={(isolates ?? []) as unknown as { id: string; colony_count: string | null; significance: string; edoslmis_micro_organisms: { name: string } | null }[]}
        sensitivitiesByIsolate={sensitivitiesByIsolate}
        organisms={organisms ?? []}
        antibiotics={antibiotics ?? []}
      />
    </div>
  );
}
