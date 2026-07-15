import { createClient } from "@/lib/supabase/server";
import { BarcodeLabel } from "@/components/barcode-label";
import { notFound } from "next/navigation";

export default async function SpecimenLabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: specimen, error: specimenError } = await supabase
    .from("edoslmis_specimens")
    .select(
      "specimen_number, collected_at, edoslmis_specimen_types(name), edoslmis_orders(edoslmis_patients(first_name, last_name, patient_number))"
    )
    .eq("id", id)
    .single();

  if (specimenError) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{specimenError.message}</p>
      </div>
    );
  }
  if (!specimen) notFound();

  const specimenType = specimen.edoslmis_specimen_types as unknown as { name: string } | null;
  const order = specimen.edoslmis_orders as unknown as {
    edoslmis_patients: { first_name: string; last_name: string; patient_number: string } | null;
  } | null;
  const patient = order?.edoslmis_patients;

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Specimen Label</h1>
        <p className="text-sm text-muted-foreground">{specimen.specimen_number}</p>
      </div>
      <BarcodeLabel
        specimenNumber={specimen.specimen_number}
        patientName={patient ? `${patient.first_name} ${patient.last_name}` : "Unknown"}
        patientNumber={patient?.patient_number ?? "-"}
        specimenType={specimenType?.name ?? "-"}
        collectedAt={specimen.collected_at}
      />
    </div>
  );
}
