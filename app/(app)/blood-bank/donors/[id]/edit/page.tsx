import { createClient } from "@/lib/supabase/server";
import { EditDonorForm } from "@/components/edit-donor-form";
import { notFound } from "next/navigation";

export default async function EditDonorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: donor, error: donorError } = await supabase
    .from("edoslmis_bb_donors")
    .select("id, first_name, last_name, gender, date_of_birth, phone, national_id, donor_type, blood_group")
    .eq("id", id)
    .single();

  if (donorError) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{donorError.message}</p>
      </div>
    );
  }
  if (!donor) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Edit Donor</h1>
        <p className="text-sm text-muted-foreground">Update donor details</p>
      </div>
      <EditDonorForm donor={donor} />
    </div>
  );
}
