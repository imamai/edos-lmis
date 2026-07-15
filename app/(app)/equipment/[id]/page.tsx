import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MaintenanceLogForm } from "@/components/maintenance-log-form";
import { ReportDowntimeForm, ResolveDowntimeButton } from "@/components/downtime-actions";
import { EquipmentActiveToggle } from "@/components/equipment-active-toggle";
import { DeleteEntityButton } from "@/components/delete-entity-button";
import { deleteEquipment } from "@/lib/actions/equipment";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

const statusTone: Record<string, "success" | "warning" | "critical" | "neutral"> = {
  operational: "success",
  under_maintenance: "warning",
  out_of_service: "critical",
  decommissioned: "neutral",
};

const maintenanceTypeTone: Record<string, "neutral" | "success" | "critical" | "warning" | "info"> = {
  preventive: "success",
  corrective: "warning",
  calibration: "info",
  validation: "neutral",
  installation: "neutral",
};

const qcStatusTone: Record<string, "success" | "warning" | "critical"> = {
  accepted: "success",
  warning: "warning",
  rejected: "critical",
};

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: equipment } = await supabase
    .from("edoslmis_equipment")
    .select(
      "id, code, name, equipment_type, manufacturer, model, serial_number, location, status, is_active, installation_date, next_calibration_due, next_maintenance_due, edoslmis_departments(name)"
    )
    .eq("id", id)
    .single();

  if (!equipment) notFound();

  const [{ data: logs }, { data: downtimeLogs }, { data: qcRuns }] = await Promise.all([
    supabase
      .from("edoslmis_equipment_maintenance_logs")
      .select("id, maintenance_type, vendor_name, description, cost, downtime_hours, performed_at, next_due_date")
      .eq("equipment_id", id)
      .order("performed_at", { ascending: false }),
    supabase
      .from("edoslmis_equipment_downtime_logs")
      .select("id, reason, started_at, ended_at")
      .eq("equipment_id", id)
      .order("started_at", { ascending: false }),
    supabase
      .from("edoslmis_qc_runs")
      .select("id, value, z_score, status, violated_rules, run_at, edoslmis_qc_materials(level, lot_number, edoslmis_tests(name))")
      .eq("equipment_id", id)
      .order("run_at", { ascending: false })
      .limit(20),
  ]);

  const dept = equipment.edoslmis_departments as unknown as { name: string } | null;
  const openDowntime = downtimeLogs?.find((d) => !d.ended_at);
  const activeQcViolations = (qcRuns ?? []).filter((r) => r.status !== "accepted").length;
  const usageCount = (logs?.length ?? 0) + (downtimeLogs?.length ?? 0) + (qcRuns?.length ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{equipment.name}</h1>
          <p className="text-sm text-muted-foreground">
            {equipment.code} &middot; {dept?.name ?? "Unassigned"} &middot; {equipment.manufacturer ?? "-"} {equipment.model ?? ""}
          </p>
        </div>
        <div className="text-right space-y-1">
          <Badge tone={statusTone[equipment.status] ?? "neutral"}>{equipment.status.replace(/_/g, " ")}</Badge>
          {activeQcViolations > 0 && (
            <Badge tone="critical" className="ml-2">
              {activeQcViolations} QC issue{activeQcViolations > 1 ? "s" : ""} (recent)
            </Badge>
          )}
          <p className="text-xs text-muted-foreground">Serial: {equipment.serial_number ?? "-"}</p>
          <p className="text-xs text-muted-foreground">Location: {equipment.location ?? "-"}</p>
          {!equipment.is_active && <Badge tone="neutral">Inactive</Badge>}
          <div className="flex justify-end gap-2 pt-1">
            <Link href={`/equipment/${id}/edit`}>
              <Button variant="outline">
                <Pencil size={16} /> Edit
              </Button>
            </Link>
            <EquipmentActiveToggle equipmentId={equipment.id} isActive={equipment.is_active} />
            <DeleteEntityButton
              id={equipment.id}
              action={deleteEquipment}
              canDelete={usageCount < 2}
              blockedMessage={usageCount >= 2 ? "Has service/QC history — deactivate instead." : undefined}
              entityLabel="equipment"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Next Calibration Due</p>
              <p className="text-lg font-semibold text-foreground">{equipment.next_calibration_due ?? "-"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Next Maintenance Due</p>
              <p className="text-lg font-semibold text-foreground">{equipment.next_maintenance_due ?? "-"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Breakdown / Downtime</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {openDowntime ? (
            <div className="flex items-center justify-between rounded-lg bg-critical/10 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-critical">Currently out of service</p>
                <p className="text-xs text-muted-foreground">
                  {openDowntime.reason} &middot; since {new Date(openDowntime.started_at).toLocaleString()}
                </p>
              </div>
              <ResolveDowntimeButton downtimeId={openDowntime.id} equipmentId={id} />
            </div>
          ) : (
            <ReportDowntimeForm equipmentId={id} />
          )}

          {(downtimeLogs?.length ?? 0) > 0 && (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Started</th>
                  <th className="py-1 font-medium">Ended</th>
                  <th className="py-1 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {downtimeLogs?.map((d) => (
                  <tr key={d.id} className="border-t border-border">
                    <td className="py-1.5 text-muted-foreground">{new Date(d.started_at).toLocaleString()}</td>
                    <td className="py-1.5 text-muted-foreground">{d.ended_at ? new Date(d.ended_at).toLocaleString() : "-"}</td>
                    <td className="py-1.5 text-foreground">{d.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log Maintenance / Calibration</CardTitle>
        </CardHeader>
        <CardContent>
          <MaintenanceLogForm equipmentId={id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Vendor</th>
                <th className="px-4 py-2 font-medium">Cost</th>
                <th className="px-4 py-2 font-medium">Downtime</th>
                <th className="px-4 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {(logs?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No service records yet.</td>
                </tr>
              )}
              {logs?.map((log) => (
                <tr key={log.id} className="border-t border-border">
                  <td className="px-4 py-2 text-muted-foreground">{new Date(log.performed_at).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <Badge tone={maintenanceTypeTone[log.maintenance_type] ?? "neutral"}>
                      {log.maintenance_type}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{log.vendor_name ?? "-"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{log.cost ? `KES ${log.cost}` : "-"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{log.downtime_hours}h</td>
                  <td className="px-4 py-2 text-muted-foreground">{log.description ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent QC Runs on This Instrument</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Test</th>
                <th className="px-4 py-2 font-medium">Level / Lot</th>
                <th className="px-4 py-2 font-medium">Value</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(qcRuns?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    No QC runs logged against this instrument yet.
                  </td>
                </tr>
              )}
              {qcRuns?.map((r) => {
                const material = r.edoslmis_qc_materials as unknown as {
                  level: string;
                  lot_number: string;
                  edoslmis_tests: { name: string } | null;
                } | null;
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-2 text-muted-foreground">{new Date(r.run_at).toLocaleString()}</td>
                    <td className="px-4 py-2 text-foreground">{material?.edoslmis_tests?.name ?? "-"}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {material?.level} &middot; {material?.lot_number}
                    </td>
                    <td className="px-4 py-2 font-medium text-foreground">{r.value}</td>
                    <td className="px-4 py-2">
                      <Badge tone={qcStatusTone[r.status] ?? "neutral"}>{r.status}</Badge>
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
