import { createClient } from "@/lib/supabase/server";
import { addDaysStr, todayStr } from "@/lib/data/lab-stock-checks";

export type QcPerformanceRow = {
  materialId: string;
  testName: string;
  level: string;
  lotNumber: string;
  totalRuns: number;
  accepted: number;
  warning: number;
  rejected: number;
  violationCounts: Record<string, number>;
};

export async function getQcPerformance(from: string, to: string): Promise<{ rows: QcPerformanceRow[]; error: string | null }> {
  const supabase = await createClient();
  const start = `${from}T00:00:00.000Z`;
  const end = `${addDaysStr(to, 1)}T00:00:00.000Z`;

  const { data: runs, error } = await supabase
    .from("edoslmis_qc_runs")
    .select("material_id, status, violated_rules, run_at, edoslmis_qc_materials(level, lot_number, edoslmis_tests(name))")
    .gte("run_at", start)
    .lt("run_at", end);

  if (error) return { rows: [], error: error.message };

  const byMaterial = new Map<string, QcPerformanceRow>();
  for (const run of runs ?? []) {
    const material = run.edoslmis_qc_materials as unknown as {
      level: string;
      lot_number: string;
      edoslmis_tests: { name: string } | null;
    } | null;
    const key = run.material_id;
    if (!byMaterial.has(key)) {
      byMaterial.set(key, {
        materialId: key,
        testName: material?.edoslmis_tests?.name ?? "-",
        level: material?.level ?? "-",
        lotNumber: material?.lot_number ?? "-",
        totalRuns: 0,
        accepted: 0,
        warning: 0,
        rejected: 0,
        violationCounts: {},
      });
    }
    const row = byMaterial.get(key)!;
    row.totalRuns++;
    if (run.status === "accepted") row.accepted++;
    else if (run.status === "warning") row.warning++;
    else if (run.status === "rejected") row.rejected++;
    for (const rule of (run.violated_rules as string[] | null) ?? []) {
      row.violationCounts[rule] = (row.violationCounts[rule] ?? 0) + 1;
    }
  }

  return { rows: Array.from(byMaterial.values()), error: null };
}

export type EquipmentDowntimeRow = {
  id: string;
  equipmentName: string;
  equipmentCode: string;
  reason: string;
  startedAt: string;
  endedAt: string | null;
  hours: number | null;
};

export async function getEquipmentDowntimeInPeriod(from: string, to: string): Promise<{ rows: EquipmentDowntimeRow[]; error: string | null }> {
  const supabase = await createClient();
  const start = `${from}T00:00:00.000Z`;
  const end = `${addDaysStr(to, 1)}T00:00:00.000Z`;

  const { data, error } = await supabase
    .from("edoslmis_equipment_downtime_logs")
    .select("id, reason, started_at, ended_at, edoslmis_equipment(name, code)")
    .gte("started_at", start)
    .lt("started_at", end)
    .order("started_at", { ascending: false });

  if (error) return { rows: [], error: error.message };

  const rows = (data ?? []).map((d) => {
    const equipment = d.edoslmis_equipment as unknown as { name: string; code: string } | null;
    const endedAt = d.ended_at ? new Date(d.ended_at) : null;
    const hours = endedAt ? (endedAt.getTime() - new Date(d.started_at).getTime()) / 3_600_000 : null;
    return {
      id: d.id,
      equipmentName: equipment?.name ?? "-",
      equipmentCode: equipment?.code ?? "-",
      reason: d.reason,
      startedAt: d.started_at,
      endedAt: d.ended_at,
      hours,
    };
  });

  return { rows, error: null };
}

export async function getOverdueEquipment() {
  const supabase = await createClient();
  const today = todayStr();
  const { data, error } = await supabase
    .from("edoslmis_equipment")
    .select("id, name, code, next_calibration_due, next_maintenance_due, status")
    .eq("is_active", true)
    .or(`next_calibration_due.lte.${today},next_maintenance_due.lte.${today}`);
  if (error) return { rows: [] as NonNullable<typeof data>, error: error.message };
  return { rows: data ?? [], error: null };
}

export async function getSpecimenStatsInPeriod(from: string, to: string) {
  const supabase = await createClient();
  const start = `${from}T00:00:00.000Z`;
  const end = `${addDaysStr(to, 1)}T00:00:00.000Z`;

  const [{ count: total }, { count: rejected }] = await Promise.all([
    supabase.from("edoslmis_specimens").select("id", { count: "exact", head: true }).gte("created_at", start).lt("created_at", end),
    supabase
      .from("edoslmis_specimens")
      .select("id", { count: "exact", head: true })
      .eq("status", "rejected")
      .gte("created_at", start)
      .lt("created_at", end),
  ]);

  const totalCount = total ?? 0;
  const rejectedCount = rejected ?? 0;
  return {
    total: totalCount,
    rejected: rejectedCount,
    rejectionRatePct: totalCount > 0 ? (rejectedCount / totalCount) * 100 : 0,
  };
}

export async function getAvgTatInPeriod(from: string, to: string): Promise<number | null> {
  const supabase = await createClient();
  const start = `${from}T00:00:00.000Z`;
  const end = `${addDaysStr(to, 1)}T00:00:00.000Z`;

  const { data } = await supabase
    .from("edoslmis_result_release")
    .select("released_at, edoslmis_order_tests(created_at)")
    .gte("released_at", start)
    .lt("released_at", end)
    .limit(1000);

  let totalHours = 0;
  let count = 0;
  for (const row of data ?? []) {
    const ot = row.edoslmis_order_tests as unknown as { created_at: string } | { created_at: string }[] | null;
    const createdAt = Array.isArray(ot) ? ot[0]?.created_at : ot?.created_at;
    if (!createdAt || !row.released_at) continue;
    const hours = (new Date(row.released_at).getTime() - new Date(createdAt).getTime()) / 3_600_000;
    if (hours >= 0) {
      totalHours += hours;
      count++;
    }
  }
  return count > 0 ? totalHours / count : null;
}

export async function getUnacknowledgedCriticalCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("edoslmis_critical_alerts")
    .select("id", { count: "exact", head: true })
    .is("acknowledged_at", null);
  return count ?? 0;
}
