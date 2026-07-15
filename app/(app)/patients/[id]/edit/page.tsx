import { createClient } from "@/lib/supabase/server";
import { EditPatientForm } from "@/components/edit-patient-form";
import { notFound } from "next/navigation";

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("edoslmis_patients")
    .select(
      "id, first_name, last_name, other_names, gender, date_of_birth, national_id, phone_primary, county, patient_category, next_of_kin_name, next_of_kin_phone"
    )
    .eq("id", id)
    .single();

  if (!patient) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Edit Patient</h1>
        <p className="text-sm text-muted-foreground">Update demographic and contact details</p>
      </div>
      <EditPatientForm patient={patient} />
    </div>
  );
}
