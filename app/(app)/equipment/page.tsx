import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

const statusTone: Record<string, "success" | "warning" | "critical" | "neutral"> = {
  operational: "success",
  under_maintenance: "warning",
  out_of_service: "critical",
  decommissioned: "neutral",
};

export default async function EquipmentPage() {
  const supabase = await createClient();

  const { data: equipment, error } = await supabase
    .from("edoslmis_equipment")
    .select(
      "id, code, name, equipment_type, status, next_calibration_due, next_maintenance_due, edoslmis_departments(name)"
    )
    .eq("is_active", true)
    .order("name");

  const today = new Date().toISOString().slice(0, 10);
  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);
  const in30DaysIso = in30Days.toISOString().slice(0, 10);

  function dueBadge(date: string | null) {
    if (!date) return null;
    if (date < today) return <Badge tone="critical">Overdue</Badge>;
    if (date <= in30DaysIso) return <Badge tone="warning">Due soon</Badge>;
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Equipment</h1>
          <p className="text-sm text-muted-foreground">Analyzers, instruments, and maintenance/calibration schedule</p>
        </div>
        <Link href="/equipment/new">
          <Button>
            <Plus size={16} /> Register Equipment
          </Button>
        </Link>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-muted text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Equipment</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Next Calibration</th>
              <th className="px-4 py-3 font-medium">Next Maintenance</th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-critical">{error.message}</td>
              </tr>
            )}
            {!error && (equipment?.length ?? 0) === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No equipment registered yet.</td>
              </tr>
            )}
            {equipment?.map((eq) => {
              const dept = eq.edoslmis_departments as unknown as { name: string } | null;
              return (
                <tr key={eq.id} className="border-t border-border hover:bg-surface-muted">
                  <td className="px-4 py-3">
                    <Link href={`/equipment/${eq.id}`} className="font-medium text-primary hover:underline">
                      {eq.name}
                    </Link>
                    <span className="ml-1 text-muted-foreground">({eq.code})</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{dept?.name ?? "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{eq.equipment_type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone[eq.status] ?? "neutral"}>{eq.status.replace(/_/g, " ")}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {eq.next_calibration_due ?? "-"} {dueBadge(eq.next_calibration_due)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {eq.next_maintenance_due ?? "-"} {dueBadge(eq.next_maintenance_due)}
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
