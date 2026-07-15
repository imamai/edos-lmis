import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BLOOD_GROUP_LABELS } from "@/lib/blood-compatibility";
import Link from "next/link";
import { Plus } from "lucide-react";

const statusTone: Record<string, "neutral" | "warning" | "success" | "critical"> = {
  pending: "warning",
  completed: "success",
  cancelled: "critical",
};

export default async function CrossmatchListPage() {
  const supabase = await createClient();

  const { data: requests, error } = await supabase
    .from("edoslmis_bb_crossmatch_requests")
    .select(
      "id, patient_blood_group, component_requested, units_requested, status, requested_at, edoslmis_patients(first_name, last_name, patient_number)"
    )
    .order("requested_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Crossmatch Requests</h1>
          <p className="text-sm text-muted-foreground">Pre-transfusion compatibility testing</p>
        </div>
        <Link href="/blood-bank/crossmatch/new">
          <Button><Plus size={16} /> New Request</Button>
        </Link>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Patient</th>
              <th className="px-4 py-3 font-medium">Blood Group</th>
              <th className="px-4 py-3 font-medium">Component</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Requested</th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-critical">{error.message}</td>
              </tr>
            )}
            {!error && (requests?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No crossmatch requests yet.</td>
              </tr>
            )}
            {requests?.map((r) => {
              const patient = r.edoslmis_patients as unknown as {
                first_name: string; last_name: string; patient_number: string;
              } | null;
              return (
                <tr key={r.id} className="border-t border-border hover:bg-surface-muted">
                  <td className="px-4 py-3">
                    <Link href={`/blood-bank/crossmatch/${r.id}`} className="font-medium text-primary hover:underline">
                      {patient ? `${patient.first_name} ${patient.last_name} (${patient.patient_number})` : "-"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="neutral">{r.patient_blood_group ? BLOOD_GROUP_LABELS[r.patient_blood_group] : "Unknown"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.component_requested.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone[r.status] ?? "neutral"}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(r.requested_at).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
