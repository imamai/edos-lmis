import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClearFiltersButton } from "@/components/clear-filters-button";
import { todayStr, startOfWeekStr, startOfMonthStr } from "@/lib/data/lab-stock-checks";
import {
  getQcPerformance,
  getEquipmentDowntimeInPeriod,
  getOverdueEquipment,
  getSpecimenStatsInPeriod,
  getAvgTatInPeriod,
  getUnacknowledgedCriticalCount,
} from "@/lib/data/quality-report";
import { Activity, AlertTriangle, Timer, Percent, Wrench, Bell } from "lucide-react";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const toneClasses = {
  primary: "bg-primary/15 text-primary",
  warning: "bg-warning/15 text-warning",
  critical: "bg-critical/15 text-critical",
  info: "bg-info/15 text-info",
  success: "bg-success/15 text-success",
} as const;

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: typeof Activity;
  tone: keyof typeof toneClasses;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

const ruleLabels: Record<string, string> = {
  "1_2s": "1-2s",
  "1_3s": "1-3s",
  "2_2s": "2-2s",
  "r_4s": "R-4s",
  "4_1s": "4-1s",
  "10x": "10x",
};

export default async function QualityReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const today = todayStr();
  const from = params.from && DATE_RE.test(params.from) ? params.from : startOfMonthStr(today);
  const to = params.to && DATE_RE.test(params.to) ? params.to : today;

  const [
    { rows: qcRows, error: qcError },
    { rows: downtimeRows, error: downtimeError },
    { rows: overdueEquipment },
    specimenStats,
    avgTat,
    unacknowledgedCritical,
  ] = await Promise.all([
    getQcPerformance(from, to),
    getEquipmentDowntimeInPeriod(from, to),
    getOverdueEquipment(),
    getSpecimenStatsInPeriod(from, to),
    getAvgTatInPeriod(from, to),
    getUnacknowledgedCriticalCount(),
  ]);

  const totalRuns = qcRows.reduce((s, r) => s + r.totalRuns, 0);
  const totalAccepted = qcRows.reduce((s, r) => s + r.accepted, 0);
  const totalFlagged = qcRows.reduce((s, r) => s + r.warning + r.rejected, 0);
  const qcPassRate = totalRuns > 0 ? (totalAccepted / totalRuns) * 100 : null;
  const totalDowntimeHours = downtimeRows.reduce((s, r) => s + (r.hours ?? 0), 0);

  const presetHref = (f: string, t: string) => `/reports/quality?from=${f}&to=${t}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Quality Report</h1>
        <p className="text-sm text-muted-foreground">
          QC performance, equipment reliability, and turnaround for the selected period — one place to run a
          monthly quality review instead of stitching together separate pages.
        </p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <Link href={presetHref(today, today)}>
            <Button variant="secondary" size="sm">
              Today
            </Button>
          </Link>
          <Link href={presetHref(startOfWeekStr(today), today)}>
            <Button variant="secondary" size="sm">
              This Week
            </Button>
          </Link>
          <Link href={presetHref(startOfMonthStr(today), today)}>
            <Button variant="secondary" size="sm">
              This Month
            </Button>
          </Link>
          {(params.from || params.to) && <ClearFiltersButton href="/reports/quality" />}
        </div>
        <form className="flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor="from">From</Label>
            <Input id="from" name="from" type="date" defaultValue={from} max={today} />
          </div>
          <div>
            <Label htmlFor="to">To</Label>
            <Input id="to" name="to" type="date" defaultValue={to} max={today} />
          </div>
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        </form>
      </div>

      {(qcError || downtimeError) && (
        <div className="rounded-lg border border-critical/30 bg-critical/10 px-4 py-3 text-sm text-critical">
          {qcError ?? downtimeError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="QC Pass Rate"
          value={qcPassRate !== null ? `${qcPassRate.toFixed(1)}%` : "-"}
          icon={Activity}
          tone={qcPassRate === null || qcPassRate >= 95 ? "success" : qcPassRate >= 85 ? "warning" : "critical"}
        />
        <StatCard label="QC Runs Flagged" value={totalFlagged} icon={AlertTriangle} tone={totalFlagged > 0 ? "warning" : "success"} />
        <StatCard
          label="Equipment Downtime"
          value={`${totalDowntimeHours.toFixed(1)}h`}
          icon={Wrench}
          tone={totalDowntimeHours > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Overdue Cal./Maint."
          value={overdueEquipment.length}
          icon={Wrench}
          tone={overdueEquipment.length > 0 ? "critical" : "success"}
        />
        <StatCard
          label="Rejection Rate"
          value={`${specimenStats.rejectionRatePct.toFixed(1)}%`}
          icon={Percent}
          tone={specimenStats.rejectionRatePct > 5 ? "critical" : "success"}
        />
        <StatCard label="Avg. TAT" value={avgTat !== null ? `${avgTat.toFixed(1)}h` : "-"} icon={Timer} tone="info" />
      </div>

      {unacknowledgedCritical > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-critical/30 bg-critical/10 px-4 py-3 text-sm text-critical">
          <Bell size={16} />
          {unacknowledgedCritical} critical result{unacknowledgedCritical > 1 ? "s" : ""} still awaiting acknowledgement
          (all-time backlog, not limited to this period).
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>QC Performance by Control Lot &middot; {from} to {to}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Test</th>
                  <th className="px-4 py-2 font-medium">Level / Lot</th>
                  <th className="px-4 py-2 font-medium">Runs</th>
                  <th className="px-4 py-2 font-medium">Accepted</th>
                  <th className="px-4 py-2 font-medium">Warning</th>
                  <th className="px-4 py-2 font-medium">Rejected</th>
                  <th className="px-4 py-2 font-medium">Rules Violated</th>
                </tr>
              </thead>
              <tbody>
                {qcRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                      No QC runs logged in this period.
                    </td>
                  </tr>
                )}
                {qcRows.map((row) => (
                  <tr key={row.materialId} className="border-t border-border">
                    <td className="px-4 py-2 text-foreground">{row.testName}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {row.level} &middot; {row.lotNumber}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{row.totalRuns}</td>
                    <td className="px-4 py-2 text-success">{row.accepted}</td>
                    <td className="px-4 py-2 text-warning">{row.warning}</td>
                    <td className="px-4 py-2 text-critical">{row.rejected}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {Object.keys(row.violationCounts).length > 0
                        ? Object.entries(row.violationCounts)
                            .map(([rule, count]) => `${ruleLabels[rule] ?? rule} (${count})`)
                            .join(", ")
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipment Downtime &middot; {from} to {to}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Instrument</th>
                  <th className="px-4 py-2 font-medium">Reason</th>
                  <th className="px-4 py-2 font-medium">Started</th>
                  <th className="px-4 py-2 font-medium">Resolved</th>
                  <th className="px-4 py-2 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {downtimeRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                      No downtime incidents in this period.
                    </td>
                  </tr>
                )}
                {downtimeRows.map((d) => (
                  <tr key={d.id} className="border-t border-border">
                    <td className="px-4 py-2 text-foreground">
                      {d.equipmentName} ({d.equipmentCode})
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{d.reason}</td>
                    <td className="px-4 py-2 text-muted-foreground">{new Date(d.startedAt).toLocaleString()}</td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {d.endedAt ? new Date(d.endedAt).toLocaleString() : <Badge tone="critical">Ongoing</Badge>}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{d.hours !== null ? `${d.hours.toFixed(1)}h` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {overdueEquipment.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Equipment Overdue for Calibration / Maintenance</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {overdueEquipment.map((e) => (
              <Link
                key={e.id}
                href={`/equipment/${e.id}`}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-surface-muted"
              >
                <span className="font-medium text-foreground">{e.name}</span>
                <Badge tone="critical">Overdue</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
