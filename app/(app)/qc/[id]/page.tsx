import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QcRunForm } from "@/components/qc-run-form";
import { LeveyJenningsChart } from "@/components/levey-jennings-chart";
import { QcMaterialActiveToggle } from "@/components/qc-material-active-toggle";
import Link from "next/link";
import { notFound } from "next/navigation";

const statusTone: Record<string, "success" | "warning" | "critical"> = {
  accepted: "success",
  warning: "warning",
  rejected: "critical",
};

const ruleLabels: Record<string, string> = {
  "1_2s": "1-2s (warning)",
  "1_3s": "1-3s",
  "2_2s": "2-2s",
  "r_4s": "R-4s",
  "4_1s": "4-1s",
  "10x": "10x",
};

export default async function QcMaterialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: material, error: materialError } = await supabase
    .from("edoslmis_qc_materials")
    .select("id, level, lot_number, manufacturer, expiry_date, target_mean, target_sd, unit, is_active, edoslmis_tests(name, code)")
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

  const [{ data: runs }, { data: equipmentList }] = await Promise.all([
    supabase
      .from("edoslmis_qc_runs")
      .select("id, value, z_score, status, violated_rules, comments, run_at, edoslmis_equipment(name, code)")
      .eq("material_id", id)
      .order("run_at", { ascending: false })
      .limit(30),
    supabase.from("edoslmis_equipment").select("id, name, code").eq("is_active", true).order("name"),
  ]);

  const test = material.edoslmis_tests as unknown as { name: string; code: string } | null;
  const chartRuns = (runs ?? []).slice().reverse();
  const labels = chartRuns.map((r) => new Date(r.run_at).toLocaleDateString());
  const zScores = chartRuns.map((r) => r.z_score ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{test?.name}</h1>
          <p className="text-sm text-muted-foreground">
            {material.level} &middot; Lot {material.lot_number} &middot; {material.manufacturer ?? "-"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">
            Target: {material.target_mean} ± {material.target_sd} {material.unit ?? ""}
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <Link href={`/qc/${id}/edit`}>
              <Button variant="secondary" size="sm">
                Edit Control Lot
              </Button>
            </Link>
            <QcMaterialActiveToggle materialId={material.id} isActive={material.is_active} />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Levey-Jennings Chart</CardTitle>
        </CardHeader>
        <CardContent>
          {chartRuns.length > 0 ? (
            <LeveyJenningsChart labels={labels} zScores={zScores} />
          ) : (
            <p className="text-sm text-muted-foreground">No QC runs logged yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log QC Run</CardTitle>
        </CardHeader>
        <CardContent>
          <QcRunForm materialId={id} equipment={equipmentList ?? []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Run History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Instrument</th>
                <th className="px-4 py-2 font-medium">Value</th>
                <th className="px-4 py-2 font-medium">Z-score</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Rules Violated</th>
              </tr>
            </thead>
            <tbody>
              {(runs?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No runs recorded yet.</td>
                </tr>
              )}
              {runs?.map((r) => {
                const instrument = r.edoslmis_equipment as unknown as { name: string; code: string } | null;
                return (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-2 text-muted-foreground">{new Date(r.run_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-muted-foreground">{instrument ? `${instrument.name}` : "-"}</td>
                  <td className="px-4 py-2 font-medium text-foreground">{r.value}</td>
                  <td className="px-4 py-2 text-muted-foreground">{r.z_score?.toFixed(2) ?? "-"}</td>
                  <td className="px-4 py-2">
                    <Badge tone={statusTone[r.status] ?? "neutral"}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {(r.violated_rules as string[] | null)?.length
                      ? (r.violated_rules as string[]).map((rule) => ruleLabels[rule] ?? rule).join(", ")
                      : "-"}
                  </td>
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
