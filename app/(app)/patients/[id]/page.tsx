import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateAge } from "@/lib/utils";
import { DeactivatePatientButton } from "@/components/deactivate-patient-button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Pencil } from "lucide-react";

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: patient, error: patientError } = await supabase
    .from("edoslmis_patients")
    .select("*")
    .eq("id", id)
    .single();

  if (patientError) {
    return (
      <div className="space-y-6">
        <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">{patientError.message}</p>
      </div>
    );
  }
  if (!patient) notFound();

  const { data: orders } = await supabase
    .from("edoslmis_orders")
    .select("id, order_number, status, priority, ordered_at")
    .eq("patient_id", id)
    .order("ordered_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {patient.first_name} {patient.last_name} {patient.other_names}
          </h1>
          <p className="text-sm text-muted-foreground">
            {patient.patient_number} &middot; {patient.gender ?? "-"} &middot;{" "}
            {calculateAge(patient.date_of_birth) ?? "-"} yrs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/patients/${patient.id}/edit`}>
            <Button variant="outline">
              <Pencil size={16} /> Edit
            </Button>
          </Link>
          <Link href={`/orders/new?patient=${patient.id}`}>
            <Button>
              <Plus size={16} /> New Order
            </Button>
          </Link>
          <DeactivatePatientButton patientId={patient.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Demographics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="National ID" value={patient.national_id} />
            <Row label="Phone" value={patient.phone_primary} />
            <Row label="County" value={patient.county} />
            <Row label="Category" value={<Badge tone="neutral">{patient.patient_category}</Badge>} />
            <Row label="Next of Kin" value={patient.next_of_kin_name} />
            <Row label="NOK Phone" value={patient.next_of_kin_phone} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Order History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Order No.</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Priority</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {(orders?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                      No orders yet.
                    </td>
                  </tr>
                )}
                {orders?.map((o) => (
                  <tr key={o.id} className="border-t border-border hover:bg-surface-muted">
                    <td className="px-4 py-2">
                      <Link href={`/orders/${o.id}`} className="font-medium text-primary hover:underline">
                        {o.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-2"><Badge tone="info">{o.status}</Badge></td>
                    <td className="px-4 py-2 text-muted-foreground">{o.priority}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {new Date(o.ordered_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value ?? "-"}</span>
    </div>
  );
}
