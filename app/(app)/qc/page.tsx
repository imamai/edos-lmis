import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

const levelLabel: Record<string, string> = {
  level1: "Level 1",
  level2: "Level 2",
  level3: "Level 3",
};

export default async function QcPage() {
  const supabase = await createClient();

  const { data: materials, error } = await supabase
    .from("edoslmis_qc_materials")
    .select("id, level, lot_number, target_mean, target_sd, unit, is_active, edoslmis_tests(name, code)")
    .order("created_at");

  const materialIds = materials?.map((m) => m.id) ?? [];
  const { data: latestRuns } = materialIds.length
    ? await supabase
        .from("edoslmis_qc_runs")
        .select("material_id, status, z_score, run_at")
        .in("material_id", materialIds)
        .order("run_at", { ascending: false })
    : { data: [] as { material_id: string; status: string; z_score: number | null; run_at: string }[] };

  const latestByMaterial = new Map<string, { status: string; z_score: number | null; run_at: string }>();
  for (const run of latestRuns ?? []) {
    if (!latestByMaterial.has(run.material_id)) latestByMaterial.set(run.material_id, run);
  }

  const statusTone: Record<string, "success" | "warning" | "critical"> = {
    accepted: "success",
    warning: "warning",
    rejected: "critical",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Quality Control</h1>
          <p className="text-sm text-muted-foreground">Control lots and Westgard multirule evaluation</p>
        </div>
        <Link href="/qc/new">
          <Button>
            <Plus size={16} /> Register Control Lot
          </Button>
        </Link>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Test</th>
              <th className="px-4 py-3 font-medium">Level</th>
              <th className="px-4 py-3 font-medium">Lot</th>
              <th className="px-4 py-3 font-medium">Target (Mean ± SD)</th>
              <th className="px-4 py-3 font-medium">Last Run</th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-critical">{error.message}</td>
              </tr>
            )}
            {!error && (materials?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No control lots registered yet.</td>
              </tr>
            )}
            {materials?.map((m) => {
              const test = m.edoslmis_tests as unknown as { name: string; code: string } | null;
              const latest = latestByMaterial.get(m.id);
              return (
                <tr key={m.id} className="border-t border-border hover:bg-surface-muted">
                  <td className="px-4 py-3">
                    {!m.is_active && <Badge tone="neutral">Inactive</Badge>}{" "}
                    <Link href={`/qc/${m.id}`} className="font-medium text-primary hover:underline">
                      {test?.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{levelLabel[m.level] ?? m.level}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.lot_number}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {m.target_mean} ± {m.target_sd} {m.unit ?? ""}
                  </td>
                  <td className="px-4 py-3">
                    {latest ? (
                      <span className="flex items-center gap-2">
                        <Badge tone={statusTone[latest.status] ?? "neutral"}>{latest.status}</Badge>
                        <span className="text-muted-foreground">z={latest.z_score?.toFixed(2)}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">No runs yet</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
