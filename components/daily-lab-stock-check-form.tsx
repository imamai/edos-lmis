"use client";

import { useActionState, useState } from "react";
import { saveDailyLabStockChecks } from "@/lib/actions/lab-stock-checks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PostStockCorrectionButton } from "@/components/post-stock-correction-button";

export type DailyCheckRow = {
  itemId: string;
  code: string;
  name: string;
  unitOfMeasure: string;
  trackingMode: string;
  auto: {
    beginningBalance: number;
    qtyReceived: number;
    qtyReceivedOtherSources: number;
    quantityUsed: number;
    lossesWastage: number;
    positiveAdjustments: number;
    negativeAdjustments: number;
    expiringUnder6Months: number;
  };
  manual: {
    quantityUsed: number;
    quantityUsedIsManual: boolean;
    physicalCount: number;
    testsDone: number;
    qaqcRepeats: number;
    stockedOutQty: number;
    quantityRequiredSupply: number;
    notes: string;
  };
};

function fmt(n: number) {
  return Number.isInteger(n) ? n.toString() : n.toFixed(2);
}

function DailyCheckTableRow({ row, date }: { row: DailyCheckRow; date: string }) {
  const [quantityUsed, setQuantityUsed] = useState(row.manual.quantityUsed);
  const [isManual, setIsManual] = useState(row.manual.quantityUsedIsManual);
  const [physicalCount, setPhysicalCount] = useState(row.manual.physicalCount);

  const expectedBalance =
    row.auto.beginningBalance +
    row.auto.qtyReceived +
    row.auto.qtyReceivedOtherSources -
    quantityUsed -
    row.auto.lossesWastage +
    row.auto.positiveAdjustments -
    row.auto.negativeAdjustments;

  const hasDiscrepancy = Math.abs(physicalCount - expectedBalance) > 0.01;

  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2 font-medium text-foreground">
        {row.name} <span className="text-muted-foreground">({row.code})</span>
        {row.trackingMode === "manual_entry" && (
          <Badge
            tone="info"
            className="ml-2"
            title="Tracked via Record Stock Movement (manual usage), not Orders → Results. Quantity Used here is auto-derived from that ledger, same as an order-driven item's."
          >
            Manual entry
          </Badge>
        )}
      </td>
      <td className="px-3 py-2 text-muted-foreground" title="Auto-derived from the stock ledger">
        {fmt(row.auto.beginningBalance)}
      </td>
      <td className="px-3 py-2 text-muted-foreground" title="Auto-derived from the stock ledger">
        {fmt(row.auto.qtyReceived)}
      </td>
      <td className="px-3 py-2 text-muted-foreground" title="Auto-derived from the stock ledger">
        {fmt(row.auto.qtyReceivedOtherSources)}
      </td>
      <td className="px-3 py-2">
        <input type="hidden" name={`quantity_used_is_manual__${row.itemId}`} value={isManual ? "1" : "0"} />
        <div className="flex items-center gap-1">
          <Input
            name={`quantity_used__${row.itemId}`}
            type="number"
            step="0.01"
            value={quantityUsed}
            onChange={(e) => {
              setQuantityUsed(Number(e.target.value) || 0);
              setIsManual(true);
            }}
            className="w-24"
            title="Defaults to usage derived from the stock ledger — edit if the actual amount used differs. Expected Balance recalculates as you change this."
          />
          {isManual ? (
            <button
              type="button"
              title="Revert to the ledger-derived value and keep tracking it live"
              onClick={() => {
                setQuantityUsed(row.auto.quantityUsed);
                setIsManual(false);
              }}
              className="shrink-0 text-xs text-muted-foreground underline hover:text-foreground"
            >
              auto
            </button>
          ) : (
            <span className="shrink-0 text-xs text-muted-foreground" title="Live — tracks the stock ledger">
              (auto)
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2">
        <Input name={`tests_done__${row.itemId}`} type="number" step="0.01" defaultValue={row.manual.testsDone} className="w-24" />
      </td>
      <td className="px-3 py-2">
        <Input name={`qaqc_repeats__${row.itemId}`} type="number" step="0.01" defaultValue={row.manual.qaqcRepeats} className="w-24" />
      </td>
      <td className="px-3 py-2 text-muted-foreground" title="Auto-derived from the stock ledger">
        {fmt(row.auto.lossesWastage)}
      </td>
      <td className="px-3 py-2 text-muted-foreground" title="Auto-derived from the stock ledger">
        {fmt(row.auto.positiveAdjustments)}
      </td>
      <td className="px-3 py-2 text-muted-foreground" title="Auto-derived from the stock ledger">
        {fmt(row.auto.negativeAdjustments)}
      </td>
      <td className="px-3 py-2 text-muted-foreground" title="Auto-derived from active batch expiry dates">
        {fmt(row.auto.expiringUnder6Months)}
      </td>
      <td className="px-3 py-2">
        <Input name={`stocked_out_qty__${row.itemId}`} type="number" step="0.01" defaultValue={row.manual.stockedOutQty} className="w-24" />
      </td>
      <td
        className="px-3 py-2 text-muted-foreground"
        title="Beginning balance + receipts - quantity used - wastage + adjustments — what the system expects is on the shelf"
      >
        {fmt(expectedBalance)}
      </td>
      <td className="px-3 py-2">
        <Input
          name={`physical_count__${row.itemId}`}
          type="number"
          step="0.01"
          value={physicalCount}
          onChange={(e) => setPhysicalCount(Number(e.target.value) || 0)}
          className={`w-24 ${hasDiscrepancy ? "border-critical text-critical" : ""}`}
          title="What was actually counted on the shelf — defaults to Expected Balance but enter the real count. Highlighted when it disagrees with Expected Balance."
        />
        {hasDiscrepancy && (
          <>
            <p className="mt-1 text-xs text-critical">
              {physicalCount > expectedBalance ? "+" : ""}
              {fmt(physicalCount - expectedBalance)} vs expected
            </p>
            <div className="mt-1">
              {isManual ? (
                <p className="text-xs text-muted-foreground">
                  Revert Quantity Used to (auto) to post a correction — Expected Balance isn&apos;t ledger-verified
                  while it&apos;s manually overridden.
                </p>
              ) : (
                <PostStockCorrectionButton itemId={row.itemId} checkDate={date} difference={physicalCount - expectedBalance} />
              )}
            </div>
          </>
        )}
      </td>
      <td className="px-3 py-2">
        <Input
          name={`quantity_required_supply__${row.itemId}`}
          type="number"
          step="0.01"
          defaultValue={row.manual.quantityRequiredSupply}
          className="w-24"
        />
      </td>
      <td className="px-3 py-2">
        <Input name={`notes__${row.itemId}`} defaultValue={row.manual.notes} className="w-40" />
      </td>
    </tr>
  );
}

export function DailyLabStockCheckForm({ date, rows }: { date: string; rows: DailyCheckRow[] }) {
  const [state, formAction, pending] = useActionState(saveDailyLabStockChecks, null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="check_date" value={date} />
      {rows.map((row) => (
        <input key={row.itemId} type="hidden" name="item_id" value={row.itemId} />
      ))}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[1800px] text-sm">
          <thead className="bg-surface-muted text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Commodity</th>
              <th className="px-3 py-2 font-medium">Beginning Balance</th>
              <th className="px-3 py-2 font-medium">Qty Received (KEMSA)</th>
              <th className="px-3 py-2 font-medium">Qty Received (Other Sources)</th>
              <th className="px-3 py-2 font-medium">Quantity Used</th>
              <th className="px-3 py-2 font-medium">Tests Done</th>
              <th className="px-3 py-2 font-medium">QAQC Repeats</th>
              <th className="px-3 py-2 font-medium">Losses/Wastage</th>
              <th className="px-3 py-2 font-medium">Positive Adj.</th>
              <th className="px-3 py-2 font-medium">Negative Adj.</th>
              <th className="px-3 py-2 font-medium">Expiring &lt;6mo</th>
              <th className="px-3 py-2 font-medium">#Stocked Out</th>
              <th className="px-3 py-2 font-medium">Expected Balance</th>
              <th className="px-3 py-2 font-medium">Physical Count</th>
              <th className="px-3 py-2 font-medium">Qty Required (Supply)</th>
              <th className="px-3 py-2 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={16} className="px-4 py-6 text-center text-muted-foreground">
                  No active commodities to check.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <DailyCheckTableRow key={row.itemId} row={row} date={date} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || rows.length === 0}>
          {pending ? "Saving..." : "Save Daily Check"}
        </Button>
        {state?.error && <p className="text-sm text-critical">{state.error}</p>}
      </div>
    </form>
  );
}
