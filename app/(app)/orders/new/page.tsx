import { createClient } from "@/lib/supabase/server";
import { OrderForm } from "@/components/order-form";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string }>;
}) {
  const { patient: patientId } = await searchParams;
  const supabase = await createClient();

  const [{ data: departments }, { data: tests }, { data: panels }, patientResult] =
    await Promise.all([
      supabase.from("edoslmis_departments").select("id, name").eq("is_active", true).order("name"),
      supabase
        .from("edoslmis_tests")
        .select("id, code, name, price, department_id")
        .eq("is_active", true)
        .eq("is_panel", false)
        .order("name"),
      supabase
        .from("edoslmis_panels")
        .select("id, code, name, price, department_id")
        .eq("is_active", true)
        .order("name"),
      patientId
        ? supabase
            .from("edoslmis_patients")
            .select("id, first_name, last_name, patient_number")
            .eq("id", patientId)
            .single()
        : Promise.resolve({ data: null }),
    ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">New Order</h1>
        <p className="text-sm text-muted-foreground">Select patient and requested tests</p>
      </div>

      <OrderForm
        initialPatient={patientResult.data ?? null}
        departments={departments ?? []}
        tests={tests ?? []}
        panels={panels ?? []}
      />
    </div>
  );
}
