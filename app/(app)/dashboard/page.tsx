import { Fragment } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SampleTrendChart } from "@/components/sample-trend-chart";
import { ClearFiltersButton } from "@/components/clear-filters-button";
import { getDictionary } from "@/lib/i18n/get-locale";
import { todayStr, startOfWeekStr, startOfMonthStr, addDaysStr, getEstimatedManualRevenue } from "@/lib/data/lab-stock-checks";
import {
  TestTube2,
  Clock,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Boxes,
  Timer,
  Percent,
  Wrench,
  Banknote,
  Wallet,
  FlaskRound,
  Calculator,
} from "lucide-react";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function rangeBoundsIso(from: string, to: string) {
  return { fromIso: `${from}T00:00:00.000Z`, toIso: `${addDaysStr(to, 1)}T00:00:00.000Z` };
}

async function getStats(from: string, to: string) {
  const supabase = await createClient();
  const { fromIso, toIso } = rangeBoundsIso(from, to);

  const [
    periodSamples,
    pendingSamples,
    rejectedSamples,
    criticalPending,
    pendingVerification,
    periodOrders,
    totalSpecimensPeriod,
    rejectedSpecimensPeriod,
    releasesWithTat,
    trendSpecimens,
    inventoryItems,
  ] = await Promise.all([
    supabase.from("edoslmis_specimens").select("id", { count: "exact", head: true }).gte("created_at", fromIso).lt("created_at", toIso),
    supabase
      .from("edoslmis_specimens")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending_collection", "collected", "in_transit"]),
    supabase.from("edoslmis_specimens").select("id", { count: "exact", head: true }).eq("status", "rejected"),
    supabase.from("edoslmis_critical_alerts").select("id", { count: "exact", head: true }).is("acknowledged_at", null),
    supabase.from("edoslmis_result_verification").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("edoslmis_orders").select("id", { count: "exact", head: true }).gte("created_at", fromIso).lt("created_at", toIso),
    supabase.from("edoslmis_specimens").select("id", { count: "exact", head: true }).gte("created_at", fromIso).lt("created_at", toIso),
    supabase
      .from("edoslmis_specimens")
      .select("id", { count: "exact", head: true })
      .eq("status", "rejected")
      .gte("created_at", fromIso)
      .lt("created_at", toIso),
    supabase
      .from("edoslmis_result_release")
      .select("released_at, edoslmis_order_tests(created_at)")
      .gte("released_at", fromIso)
      .lt("released_at", toIso)
      .limit(500),
    supabase.from("edoslmis_specimens").select("created_at").gte("created_at", fromIso).lt("created_at", toIso),
    supabase.from("edoslmis_inventory_items").select("id, reorder_level, edoslmis_inventory_balances(current_balance)").eq("is_active", true),
  ]);

  const nowIso = new Date().toISOString().slice(0, 10);
  const [equipmentDue, equipmentDown] = await Promise.all([
    supabase
      .from("edoslmis_equipment")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .or(`next_calibration_due.lte.${nowIso},next_maintenance_due.lte.${nowIso}`),
    supabase
      .from("edoslmis_equipment")
      .select("id", { count: "exact", head: true })
      .eq("status", "out_of_service"),
  ]);

  const [paymentsPeriod, outstandingInvoices, estimatedManualRevenue] = await Promise.all([
    supabase.from("edoslmis_payments").select("amount").gte("paid_at", fromIso).lt("paid_at", toIso),
    supabase
      .from("edoslmis_invoices")
      .select("balance_due")
      .gt("balance_due", 0)
      .not("status", "in", "(cancelled,written_off)"),
    getEstimatedManualRevenue(from, to),
  ]);
  const revenuePeriod = (paymentsPeriod.data ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const outstandingBalance = (outstandingInvoices.data ?? []).reduce((sum, i) => sum + Number(i.balance_due), 0);

  const { count: qcRejectedCount } = await supabase
    .from("edoslmis_qc_runs")
    .select("id", { count: "exact", head: true })
    .eq("status", "rejected")
    .gte("run_at", fromIso)
    .lt("run_at", toIso);

  let totalTatHours = 0;
  let tatCount = 0;
  for (const row of releasesWithTat.data ?? []) {
    const ot = row.edoslmis_order_tests as unknown as { created_at: string } | { created_at: string }[] | null;
    const createdAt = Array.isArray(ot) ? ot[0]?.created_at : ot?.created_at;
    if (!createdAt || !row.released_at) continue;
    const hours = (new Date(row.released_at).getTime() - new Date(createdAt).getTime()) / 3_600_000;
    if (hours >= 0) {
      totalTatHours += hours;
      tatCount++;
    }
  }
  const avgTatHours = tatCount > 0 ? totalTatHours / tatCount : null;

  const dayBuckets: Record<string, number> = {};
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 370) {
    dayBuckets[cursor] = 0;
    cursor = addDaysStr(cursor, 1);
    guard++;
  }
  for (const row of trendSpecimens.data ?? []) {
    const key = String(row.created_at).slice(0, 10);
    if (key in dayBuckets) dayBuckets[key]++;
  }
  const labels = Object.keys(dayBuckets);
  const values = labels.map((l) => dayBuckets[l]);

  let lowStockCount = 0;
  for (const item of inventoryItems.data ?? []) {
    const balanceRow = item.edoslmis_inventory_balances as unknown as
      | { current_balance: number }
      | { current_balance: number }[]
      | null;
    const balance = Array.isArray(balanceRow) ? balanceRow[0]?.current_balance : balanceRow?.current_balance;
    if ((balance ?? 0) <= item.reorder_level) lowStockCount++;
  }

  const totalPeriod = totalSpecimensPeriod.count ?? 0;
  const rejectedPeriod = rejectedSpecimensPeriod.count ?? 0;
  const rejectionRatePct = totalPeriod > 0 ? (rejectedPeriod / totalPeriod) * 100 : 0;

  return {
    periodSamples: periodSamples.count ?? 0,
    pendingSamples: pendingSamples.count ?? 0,
    rejectedSamples: rejectedSamples.count ?? 0,
    criticalPending: criticalPending.count ?? 0,
    pendingVerification: pendingVerification.count ?? 0,
    periodOrders: periodOrders.count ?? 0,
    lowStockCount,
    avgTatHours,
    rejectionRatePct,
    equipmentDueCount: equipmentDue.count ?? 0,
    equipmentDownCount: equipmentDown.count ?? 0,
    revenuePeriod,
    outstandingBalance,
    estimatedManualRevenue,
    qcRejectedCount: qcRejectedCount ?? 0,
    trendLabels: labels,
    trendValues: values,
  };
}

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
  icon: typeof TestTube2;
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const today = todayStr();
  const from = params.from && DATE_RE.test(params.from) ? params.from : startOfWeekStr(today);
  const to = params.to && DATE_RE.test(params.to) ? params.to : today;

  const [stats, dict] = await Promise.all([getStats(from, to), getDictionary()]);
  const t = dict.dashboard;

  const presetHref = (f: string, tt: string) => {
    const qs = new URLSearchParams({ from: f, to: tt });
    return `/dashboard?${qs.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t.title}</h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
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
            {(params.from || params.to) && <ClearFiltersButton href="/dashboard" />}
          </div>
          <form className="flex items-end gap-2">
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
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label={t.todaysSamples} value={stats.periodSamples} icon={TestTube2} tone="primary" />
        <StatCard label={t.pendingSamples} value={stats.pendingSamples} icon={Clock} tone="warning" />
        <StatCard label={t.rejectedSamples} value={stats.rejectedSamples} icon={XCircle} tone="critical" />
        <StatCard label={t.criticalResults} value={stats.criticalPending} icon={AlertTriangle} tone="critical" />
        <StatCard label={t.pendingVerification} value={stats.pendingVerification} icon={CheckCircle2} tone="info" />
        <StatCard label={t.ordersToday} value={stats.periodOrders} icon={ClipboardList} tone="success" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t.revenueToday} value={`KES ${stats.revenuePeriod.toLocaleString()}`} icon={Banknote} tone="success" />
        <StatCard label={t.outstandingBalance} value={`KES ${stats.outstandingBalance.toLocaleString()}`} icon={Wallet} tone={stats.outstandingBalance > 0 ? "warning" : "success"} />
        <StatCard
          label="Estimated Revenue (Manual Entry)"
          value={`KES ${stats.estimatedManualRevenue.amount.toLocaleString()}`}
          icon={Calculator}
          tone="info"
        />
        <StatCard label={t.qcRejections} value={stats.qcRejectedCount} icon={FlaskRound} tone={stats.qcRejectedCount > 0 ? "critical" : "success"} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label={t.lowStock} value={stats.lowStockCount} icon={Boxes} tone="warning" />
        <StatCard
          label={t.avgTat}
          value={stats.avgTatHours !== null ? `${stats.avgTatHours.toFixed(1)}h` : "-"}
          icon={Timer}
          tone="info"
        />
        <StatCard
          label={t.rejectionRate}
          value={`${stats.rejectionRatePct.toFixed(1)}%`}
          icon={Percent}
          tone={stats.rejectionRatePct > 5 ? "critical" : "success"}
        />
        <StatCard
          label={t.equipmentDue}
          value={stats.equipmentDueCount}
          icon={Wrench}
          tone={stats.equipmentDueCount > 0 ? "warning" : "success"}
        />
        <StatCard
          label={t.equipmentDown}
          value={stats.equipmentDownCount}
          icon={AlertTriangle}
          tone={stats.equipmentDownCount > 0 ? "critical" : "success"}
        />
      </div>

      {stats.estimatedManualRevenue.byCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Estimated Revenue by Category — Manual Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-0">
            <p className="px-6 text-sm text-muted-foreground">
              Quantity deducted via Record Stock Movement × test price, for manually-tracked commodities that map
              to exactly one test. Estimate only — it never posts to invoices or payments.
              {stats.estimatedManualRevenue.itemsExcluded > 0 &&
                ` ${stats.estimatedManualRevenue.itemsExcluded} manually-tracked commodit${
                  stats.estimatedManualRevenue.itemsExcluded === 1 ? "y isn't" : "ies aren't"
                } included (no single matching test).`}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-muted text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Category / Commodity</th>
                    <th className="px-4 py-2 font-medium">Test</th>
                    <th className="px-4 py-2 text-right font-medium">Quantity Used</th>
                    <th className="px-4 py-2 text-right font-medium">Unit Price</th>
                    <th className="px-4 py-2 text-right font-medium">Est. Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.estimatedManualRevenue.byCategory.map((bucket) => (
                    <Fragment key={bucket.category}>
                      <tr className="border-t border-border bg-surface-muted/50">
                        <td colSpan={4} className="px-4 py-2 font-semibold capitalize text-foreground">
                          {bucket.category}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold tabular-nums text-foreground">
                          KES {bucket.amount.toLocaleString()}
                        </td>
                      </tr>
                      {bucket.lines.map((line) => (
                        <tr key={line.itemId} className="border-t border-border">
                          <td className="px-4 py-2 pl-8 text-foreground">
                            {line.itemName} <span className="text-muted-foreground">({line.itemCode})</span>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">{line.testName}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{line.quantityUsed}</td>
                          <td className="px-4 py-2 text-right tabular-nums">KES {line.unitPrice.toLocaleString()}</td>
                          <td className="px-4 py-2 text-right font-medium tabular-nums">
                            KES {line.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.trendTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <SampleTrendChart labels={stats.trendLabels} values={stats.trendValues} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t.roadmapTitle}</CardTitle>
          <Badge tone="neutral">Roadmap</Badge>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {[
            "HL7/FHIR & offline sync",
            "SMS/WhatsApp/email notifications",
            "Multi-language (English/Kiswahili)",
          ].map((label) => (
            <Badge key={label} tone="neutral">
              {label}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
