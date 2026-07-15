import { createClient } from "@/lib/supabase/server";
import { NewQcMaterialForm } from "@/components/new-qc-material-form";

export default async function NewQcMaterialPage() {
  const supabase = await createClient();
  const { data: tests } = await supabase
    .from("edoslmis_tests")
    .select("id, name, code")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Register Control Lot</h1>
        <p className="text-sm text-muted-foreground">Set target mean/SD for a QC material lot</p>
      </div>
      <NewQcMaterialForm tests={tests ?? []} />
    </div>
  );
}
