import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DailyLabStockCheckForm, type DailyCheckRow } from "@/components/daily-lab-stock-check-form";
import { ClearFiltersButton } from "@/components/clear-filters-button";
import { getDailyCheckPrefill, getSavedChecksForDate, todayStr } from "@/lib/data/lab-stock-checks";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function DailyCheckPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = dateParam && DATE_RE.test(dateParam) ? dateParam : todayStr();

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("edoslmis_inventory_items")
    .select("id, code, name, unit_of_measure, reorder_level, tracking_mode")
    .eq("is_active", true)
    .order("name");

  const itemIds = (items ?? []).map((i) => i.id);
  const [prefillMap, savedMap] = await Promise.all([
    getDailyCheckPrefill(itemIds, date),
    getSavedChecksForDate(itemIds, date),
  ]);

  const rows: DailyCheckRow[] = (items ?? []).map((item) => {
    const saved = savedMap.get(item.id);
    const prefill = prefillMap.get(item.id);
    // Auto columns are always live — recomputed fresh from the ledger on every
    // load, even for a date that was already saved, so a later ledger fix or
    // backdated correction is reflected immediately instead of showing a stale
    // snapshot from whenever this date was last saved. Only the manual fields
    // below persist what was actually typed in.
    const quantityUsedIsManual = saved?.quantityUsedIsManual ?? false;
    const effectiveQuantityUsed = quantityUsedIsManual ? saved!.quantityUsed : prefill?.quantityUsed ?? 0;
    const beginningBalance = prefill?.beginningBalance ?? 0;
    const qtyReceived = prefill?.qtyReceived ?? 0;
    const qtyReceivedOtherSources = prefill?.qtyReceivedOtherSources ?? 0;
    const lossesWastage = prefill?.lossesWastage ?? 0;
    const positiveAdjustments = prefill?.positiveAdjustments ?? 0;
    const negativeAdjustments = prefill?.negativeAdjustments ?? 0;
    // Expected balance, using the effective (manual-or-ledger) quantity used —
    // this is a suggested starting point for Physical Count, not a value that
    // should be forced onto it: a physical count is a real shelf count and
    // must be able to disagree with what the system expects.
    const expected =
      beginningBalance + qtyReceived + qtyReceivedOtherSources - effectiveQuantityUsed - lossesWastage + positiveAdjustments - negativeAdjustments;
    const suggestedResupply = Math.max((item.reorder_level ?? 0) - expected, 0);

    return {
      itemId: item.id,
      code: item.code,
      name: item.name,
      unitOfMeasure: item.unit_of_measure,
      trackingMode: item.tracking_mode,
      auto: {
        beginningBalance,
        qtyReceived,
        qtyReceivedOtherSources,
        quantityUsed: prefill?.quantityUsed ?? 0,
        lossesWastage,
        positiveAdjustments,
        negativeAdjustments,
        expiringUnder6Months: prefill?.expiringUnder6Months ?? 0,
      },
      manual: saved
        ? {
            quantityUsed: effectiveQuantityUsed,
            quantityUsedIsManual,
            physicalCount: saved.physicalCount,
            testsDone: saved.testsDone,
            qaqcRepeats: saved.qaqcRepeats,
            stockedOutQty: saved.stockedOutQty,
            quantityRequiredSupply: saved.quantityRequiredSupply,
            notes: saved.notes ?? "",
          }
        : {
            quantityUsed: prefill?.quantityUsed ?? 0,
            quantityUsedIsManual: false,
            physicalCount: Math.round(expected * 100) / 100,
            testsDone: 0,
            qaqcRepeats: 0,
            stockedOutQty: 0,
            quantityRequiredSupply: Math.round(suggestedResupply * 100) / 100,
            notes: "",
          },
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Daily Lab Stock Check</h1>
          <p className="text-sm text-muted-foreground">
            Beginning balance, receipts, usage, wastage, and adjustments are auto-populated from stock records
            for the selected day — confirm the physical count and fill in the rest. Commodities badged{" "}
            <span className="font-medium text-foreground">Manual entry</span> are deducted via Record Stock
            Movement on their item page instead of through Orders → Results, but otherwise reconcile here the
            same way.
          </p>
        </div>
        <form className="flex items-end gap-2">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" defaultValue={date} max={todayStr()} />
          </div>
          <Button type="submit" variant="secondary">
            Go
          </Button>
          {dateParam && date !== todayStr() && <ClearFiltersButton href="/inventory/daily-check" />}
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {new Date(`${date}T00:00:00`).toLocaleDateString("en-KE", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DailyLabStockCheckForm date={date} rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
