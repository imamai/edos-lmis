import { createClient } from "@/lib/supabase/server";
import { NewBloodUnitForm } from "@/components/new-blood-unit-form";

export default async function NewBloodUnitPage() {
  const supabase = await createClient();
  const { data: donors } = await supabase
    .from("edoslmis_bb_donors")
    .select("id, first_name, last_name, donor_number, blood_group")
    .eq("is_active", true)
    .order("first_name");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Add Blood Unit</h1>
        <p className="text-sm text-muted-foreground">Register a new blood unit into inventory</p>
      </div>
      <NewBloodUnitForm donors={donors ?? []} />
    </div>
  );
}
