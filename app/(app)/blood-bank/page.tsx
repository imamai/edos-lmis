import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BLOOD_GROUP_LABELS } from "@/lib/blood-compatibility";
import Link from "next/link";
import { Plus, Users, Droplet } from "lucide-react";

export default async function BloodBankPage() {
  const supabase = await createClient();

  const { data: availableUnits } = await supabase
    .from("edoslmis_bb_blood_units")
    .select("blood_group, component")
    .eq("status", "available");

  const { data: pendingRequests } = await supabase
    .from("edoslmis_bb_crossmatch_requests")
    .select("id, patient_blood_group, component_requested, units_requested, requested_at, edoslmis_patients(first_name, last_name, patient_number)")
    .eq("status", "pending")
    .order("requested_at", { ascending: false });

  const inventoryCounts = new Map<string, number>();
  for (const u of availableUnits ?? []) {
    const key = u.blood_group;
    inventoryCounts.set(key, (inventoryCounts.get(key) ?? 0) + 1);
  }

  const groups = ["O_neg", "O_pos", "A_neg", "A_pos", "B_neg", "B_pos", "AB_neg", "AB_pos"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Blood Bank</h1>
          <p className="text-sm text-muted-foreground">Donor registry, unit inventory, crossmatch & transfusion</p>
        </div>
        <div className="flex gap-2">
          <Link href="/blood-bank/donors">
            <Button variant="secondary"><Users size={16} /> Donors</Button>
          </Link>
          <Link href="/blood-bank/units">
            <Button variant="secondary"><Droplet size={16} /> Units</Button>
          </Link>
          <Link href="/blood-bank/crossmatch/new">
            <Button><Plus size={16} /> New Crossmatch Request</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Units by Group</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {groups.map((g) => (
            <div key={g} className="rounded-lg border border-border p-3 text-center">
              <p className="text-lg font-semibold text-foreground">{inventoryCounts.get(g) ?? 0}</p>
              <p className="text-xs text-muted-foreground">{BLOOD_GROUP_LABELS[g]}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Crossmatch Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Patient</th>
                <th className="px-4 py-2 font-medium">Blood Group</th>
                <th className="px-4 py-2 font-medium">Component</th>
                <th className="px-4 py-2 font-medium">Units</th>
                <th className="px-4 py-2 font-medium">Requested</th>
              </tr>
            </thead>
            <tbody>
              {(pendingRequests?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No pending requests.</td>
                </tr>
              )}
              {pendingRequests?.map((r) => {
                const patient = r.edoslmis_patients as unknown as {
                  first_name: string; last_name: string; patient_number: string;
                } | null;
                return (
                  <tr key={r.id} className="border-t border-border hover:bg-surface-muted">
                    <td className="px-4 py-2">
                      <Link href={`/blood-bank/crossmatch/${r.id}`} className="font-medium text-primary hover:underline">
                        {patient ? `${patient.first_name} ${patient.last_name} (${patient.patient_number})` : "-"}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone="neutral">{r.patient_blood_group ? BLOOD_GROUP_LABELS[r.patient_blood_group] : "Unknown"}</Badge>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{r.component_requested.replace(/_/g, " ")}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.units_requested}</td>
                    <td className="px-4 py-2 text-muted-foreground">{new Date(r.requested_at).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
