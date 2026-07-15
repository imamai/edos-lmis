import { createClient } from "@/lib/supabase/server";
import { EditQcMaterialForm } from "@/components/edit-qc-material-form";
import { notFound } from "next/navigation";

export default async function EditQcMaterialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: material, error: materialError } = await supabase
    .from("edoslmis_qc_materials")
    .select("id, lot_number, manufacturer, expiry_date, target_mean, target_sd, unit, is_active, edoslmis_tests(name, code)")
    .eq("id", id)
    .single();

  if (materialError) {
    return (
      <div className="space-y-6">
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{materialError.message}</p>
      </div>
    );
  }
  if (!material) notFound();

  const test = material.edoslmis_tests as unknown as { name: string; code: string } | null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Edit Control Lot</h1>
        <p className="text-sm text-muted-foreground">
          {test?.name} ({test?.code})
        </p>
      </div>
      <EditQcMaterialForm material={material} />
    </div>
  );
}
