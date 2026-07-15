import { createClient } from "@/lib/supabase/server";
import { getSettingsList } from "@/lib/data/settings-lists";
import { HistopathologyWorkup } from "@/components/histopathology-workup";
import { notFound } from "next/navigation";

export default async function HistopathologyPage({
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

  const { data: histoCase } = await supabase
    .from("edoslmis_histo_cases")
    .select("id, specimen_type, status, clinical_history, gross_description, number_of_pieces")
    .eq("order_test_id", id)
    .maybeSingle();

  const [{ data: blocks }, { data: diagnosis }] = await Promise.all([
    histoCase
      ? supabase
          .from("edoslmis_histo_blocks")
          .select("id, block_number, tissue_description")
          .eq("case_id", histoCase.id)
          .order("block_number")
      : Promise.resolve({ data: [] }),
    histoCase
      ? supabase
          .from("edoslmis_histo_diagnoses")
          .select("id, microscopic_description, diagnosis, icd_o_code, margins_status, signed_at")
          .eq("case_id", histoCase.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const slidesByBlock: Record<string, { id: string; block_id: string; slide_number: string; stain_type: string }[]> = {};
  for (const block of blocks ?? []) {
    const { data: slides } = await supabase
      .from("edoslmis_histo_slides")
      .select("id, block_id, slide_number, stain_type")
      .eq("block_id", block.id)
      .order("slide_number");
    slidesByBlock[block.id] = slides ?? [];
  }

  const stainTypes = await getSettingsList("histopathology_stain");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{test?.name} — Histopathology</h1>
        <p className="text-sm text-muted-foreground">
          {order?.order_number} &middot; {patient ? `${patient.first_name} ${patient.last_name}` : "-"} ({patient?.patient_number})
        </p>
      </div>

      <HistopathologyWorkup
        orderTestId={id}
        histoCase={histoCase ?? null}
        blocks={blocks ?? []}
        slidesByBlock={slidesByBlock}
        diagnosis={diagnosis ?? null}
        stainTypes={stainTypes}
      />
    </div>
  );
}
