import { createClient } from "@/lib/supabase/server";
import { MolecularWorkup } from "@/components/molecular-workup";
import { notFound } from "next/navigation";

export default async function MolecularPage({
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

  const { data: run } = await supabase
    .from("edoslmis_molecular_runs")
    .select("id, assay_name, status")
    .eq("order_test_id", id)
    .maybeSingle();

  const { data: targets } = run
    ? await supabase
        .from("edoslmis_molecular_targets")
        .select("id, target_name, ct_value, result")
        .eq("run_id", run.id)
        .order("created_at")
    : { data: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{test?.name} — Molecular / PCR</h1>
        <p className="text-sm text-muted-foreground">
          {order?.order_number} &middot; {patient ? `${patient.first_name} ${patient.last_name}` : "-"} ({patient?.patient_number})
        </p>
      </div>

      <MolecularWorkup orderTestId={id} run={run ?? null} targets={targets ?? []} />
    </div>
  );
}
