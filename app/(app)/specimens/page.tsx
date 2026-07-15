import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SpecimenActions } from "@/components/specimen-actions";
import { getDictionary } from "@/lib/i18n/get-locale";
import Link from "next/link";

export default async function SpecimensPage() {
  const supabase = await createClient();
  const dict = await getDictionary();
  const t = dict.specimens;

  const [{ data: awaitingReception }, { data: recent }] = await Promise.all([
    supabase
      .from("edoslmis_specimens")
      .select(
        "id, specimen_number, status, collected_at, edoslmis_specimen_types(name), edoslmis_orders(order_number, edoslmis_patients(first_name, last_name, patient_number))"
      )
      .eq("status", "collected")
      .order("collected_at", { ascending: true }),
    supabase
      .from("edoslmis_specimens")
      .select(
        "id, specimen_number, status, received_at, edoslmis_specimen_types(name)"
      )
      .in("status", ["received", "in_analysis", "analyzed", "rejected"])
      .order("created_at", { ascending: false })
      .limit(25),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.awaitingReception} ({awaitingReception?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">{t.colSpecimenNo}</th>
                <th className="px-4 py-2 font-medium">{t.colOrder}</th>
                <th className="px-4 py-2 font-medium">{t.colPatient}</th>
                <th className="px-4 py-2 font-medium">{t.colType}</th>
                <th className="px-4 py-2 font-medium">{t.colCollected}</th>
                <th className="px-4 py-2 font-medium">{t.colAction}</th>
              </tr>
            </thead>
            <tbody>
              {(awaitingReception?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    {t.noneAwaiting}
                  </td>
                </tr>
              )}
              {awaitingReception?.map((s) => {
                const order = s.edoslmis_orders as unknown as {
                  order_number: string;
                  edoslmis_patients: { first_name: string; last_name: string; patient_number: string } | null;
                } | null;
                const patient = order?.edoslmis_patients;
                const specimenType = s.edoslmis_specimen_types as unknown as { name: string } | null;
                return (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-4 py-2">
                      <Link href={`/specimens/${s.id}/label`} className="font-medium text-primary hover:underline">
                        {s.specimen_number}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{order?.order_number}</td>
                    <td className="px-4 py-2 text-foreground">
                      {patient ? `${patient.first_name} ${patient.last_name}` : "-"}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{specimenType?.name ?? "-"}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {s.collected_at ? new Date(s.collected_at).toLocaleTimeString() : "-"}
                    </td>
                    <td className="px-4 py-2">
                      <SpecimenActions specimenId={s.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.recentActivity}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {recent?.map((s) => {
            const specimenType = s.edoslmis_specimen_types as unknown as { name: string } | null;
            return (
              <div key={s.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <span className="font-medium text-foreground">{s.specimen_number}</span>
                <span className="text-muted-foreground">{specimenType?.name}</span>
                <Badge tone={s.status === "rejected" ? "critical" : "info"}>{s.status}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
