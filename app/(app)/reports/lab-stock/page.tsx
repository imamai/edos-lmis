import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LabStockReportTable } from "@/components/lab-stock-report-table";
import { LabStockTrendChart } from "@/components/lab-stock-trend-chart";
import { ClearFiltersButton } from "@/components/clear-filters-button";
import {
  getLabStockReport,
  getDailyUsageTrend,
  todayStr,
  startOfWeekStr,
  startOfMonthStr,
} from "@/lib/data/lab-stock-checks";
import { Boxes, AlertTriangle, PackageX, Trash2, Activity } from "lucide-react";

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
  note,
}: {
  label: string;
  value: string | number;
  icon: typeof Boxes;
  tone: keyof typeof toneClasses;
  note?: string;
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
          {note && <p className="text-xs text-warning">{note}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function LabStockReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; department?: string }>;
}) {
  const params = await searchParams;
  const today = todayStr();
  const from = params.from && DATE_RE.test(params.from) ? params.from : startOfWeekStr(today);
  const to = params.to && DATE_RE.test(params.to) ? params.to : today;
  const departmentId = params.department || undefined;

  const supabase = await createClient();
  const [{ data: departments }, { rows, error: reportError }, trend] = await Promise.all([
    supabase.from("edoslmis_departments").select("id, name").order("name"),
    getLabStockReport(from, to, departmentId),
    getDailyUsageTrend(from, to, departmentId),
  ]);

  const belowReorder = rows.filter((r) => r.hasEntries && r.physicalCount <= r.reorderLevel).length;
  const stockedOut = rows.filter((r) => r.stockedOutQty > 0).length;
  const expiringSoon = rows.filter((r) => r.expiringUnder6Months > 0).length;
  const totalWastage = rows.reduce((s, r) => s + r.lossesWastage, 0);
  const totalUsed = rows.reduce((s, r) => s + r.quantityUsed, 0);
  const manualUsedDays = rows.reduce(
    (count, r) => count + r.dailyRows.filter((d) => d.quantityUsedIsManual).length,
    0
  );

  const presetHref = (f: string, t: string) => {
    const qs = new URLSearchParams({ from: f, to: t });
    if (departmentId) qs.set("department", departmentId);
    return `/reports/lab-stock?${qs.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Lab Stock Report</h1>
          <p className="text-sm text-muted-foreground">
            Commodity stock, usage, and reconciliation for the selected period &mdash; fed by the daily lab stock
            check.
          </p>
        </div>
        <Link href="/inventory/daily-check">
          <Button variant="secondary">Record Today&apos;s Check</Button>
        </Link>
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
          {(params.from || params.to || params.department) && <ClearFiltersButton href="/reports/lab-stock" />}
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
          <div>
            <Label htmlFor="department">Department</Label>
            <Select id="department" name="department" defaultValue={departmentId ?? ""}>
              <option value="">All departments</option>
              {departments?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        </form>
      </div>

      {reportError && (
        <div className="rounded-lg border border-critical/30 bg-critical/10 px-4 py-3 text-sm text-critical">
          Couldn&apos;t load lab stock checks: {reportError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Below Reorder Level"
          value={belowReorder}
          icon={Boxes}
          tone={belowReorder > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Stocked Out (period)"
          value={stockedOut}
          icon={PackageX}
          tone={stockedOut > 0 ? "critical" : "success"}
        />
        <StatCard
          label="Expiring < 6 Months"
          value={expiringSoon}
          icon={AlertTriangle}
          tone={expiringSoon > 0 ? "warning" : "success"}
        />
        <StatCard
          label="Total Wastage (units)"
          value={totalWastage}
          icon={Trash2}
          tone={totalWastage > 0 ? "critical" : "success"}
        />
        <StatCard
          label="Total Used (units)"
          value={totalUsed}
          icon={Activity}
          tone="info"
          note={manualUsedDays > 0 ? `Includes ${manualUsedDays} manually-entered day(s)` : undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quantity Used per Day</CardTitle>
        </CardHeader>
        <CardContent>
          <LabStockTrendChart labels={trend.labels} values={trend.values} />
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">
          Lab Stock Checks &middot; {from} to {to}
        </h2>
        <LabStockReportTable rows={rows} />
      </div>
    </div>
  );
}
