import { createClient } from "@/lib/supabase/server";

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysStr(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonthsStr(date: string, months: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function startOfWeekStr(date: string): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // week starts Monday
  return addDaysStr(date, diff);
}

export function startOfMonthStr(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonthStr(date: string): string {
  const start = startOfMonthStr(date);
  return addDaysStr(addMonthsStr(start, 1), -1);
}

function dayBoundsIso(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export type DailyCheckPrefill = {
  itemId: string;
  beginningBalance: number;
  qtyReceived: number;
  qtyReceivedOtherSources: number;
  quantityUsed: number;
  lossesWastage: number;
  positiveAdjustments: number;
  negativeAdjustments: number;
  expiringUnder6Months: number;
  computedExpectedBalance: number;
};

/**
 * Derives the auto-populated columns for a given check date from the existing
 * stock ledger, so staff never retype numbers that already live in
 * edoslmis_stock_transactions / edoslmis_stock_batches.
 */
export async function getDailyCheckPrefill(
  itemIds: string[],
  date: string
): Promise<Map<string, DailyCheckPrefill>> {
  const result = new Map<string, DailyCheckPrefill>();
  if (itemIds.length === 0) return result;

  const supabase = await createClient();
  const { startIso, endIso } = dayBoundsIso(date);
  const sixMonthsOut = addMonthsStr(date, 6);

  const [dayTxRes, priorTxRes, batchesRes] = await Promise.all([
    supabase
      .from("edoslmis_stock_transactions")
      .select("item_id, transaction_type, quantity_change")
      .in("item_id", itemIds)
      .gte("performed_at", startIso)
      .lt("performed_at", endIso),
    supabase
      .from("edoslmis_stock_transactions")
      .select("item_id, balance_after, performed_at")
      .in("item_id", itemIds)
      .lt("performed_at", startIso)
      .order("performed_at", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    supabase
      .from("edoslmis_stock_batches")
      .select("item_id, quantity_remaining, expiry_date")
      .in("item_id", itemIds)
      .eq("is_active", true)
      .gte("expiry_date", date)
      .lte("expiry_date", sixMonthsOut),
  ]);

  for (const [label, res] of [
    ["dayTx", dayTxRes],
    ["priorTx", priorTxRes],
    ["batches", batchesRes],
  ] as const) {
    if (res.error) console.error(`getDailyCheckPrefill: ${label} query failed`, res.error);
  }
  const { data: dayTx } = dayTxRes;
  const { data: priorTx } = priorTxRes;
  const { data: batches } = batchesRes;

  const latestLedgerBalance = new Map<string, number>();
  for (const row of priorTx ?? []) {
    if (!latestLedgerBalance.has(row.item_id)) {
      latestLedgerBalance.set(row.item_id, Number(row.balance_after));
    }
  }

  const expiringByItem = new Map<string, number>();
  for (const row of batches ?? []) {
    expiringByItem.set(row.item_id, (expiringByItem.get(row.item_id) ?? 0) + Number(row.quantity_remaining));
  }

  type Flow = { opening: number; received: number; other: number; used: number; wastage: number; pos: number; neg: number };
  const flows = new Map<string, Flow>();
  for (const id of itemIds) flows.set(id, { opening: 0, received: 0, other: 0, used: 0, wastage: 0, pos: 0, neg: 0 });

  for (const tx of dayTx ?? []) {
    const f = flows.get(tx.item_id);
    if (!f) continue;
    const signed = Number(tx.quantity_change);
    const qty = Math.abs(signed);
    switch (tx.transaction_type) {
      // A same-day opening_balance transaction (e.g. an item created/seeded today)
      // establishes the starting point for the day, not a same-day flow.
      case "opening_balance":
        f.opening += signed;
        break;
      case "receipt":
        f.received += qty;
        break;
      case "transfer_in":
        f.other += qty;
        break;
      case "test_usage":
      case "manual_usage":
        f.used += qty;
        break;
      case "transfer_out":
      case "wastage":
      case "expiry":
        f.wastage += qty;
        break;
      case "positive_adjustment":
        f.pos += qty;
        break;
      case "negative_adjustment":
        f.neg += qty;
        break;
      case "stock_count_correction":
        if (signed >= 0) f.pos += signed;
        else f.neg += Math.abs(signed);
        break;
      default:
        break;
    }
  }

  for (const itemId of itemIds) {
    const f = flows.get(itemId)!;
    // Always derive from the real ledger, never from a prior day's saved
    // Physical Count — that figure is a real shelf count and can legitimately
    // disagree with the ledger until a correction is posted, so treating it as
    // the next day's starting balance would inject an unconfirmed discrepancy
    // into the ledger-side math and silently diverge from what /inventory shows.
    const beginningBalance = (latestLedgerBalance.get(itemId) ?? 0) + f.opening;
    const computedExpectedBalance = beginningBalance + f.received + f.other - f.used - f.wastage + f.pos - f.neg;
    result.set(itemId, {
      itemId,
      beginningBalance,
      qtyReceived: f.received,
      qtyReceivedOtherSources: f.other,
      quantityUsed: f.used,
      lossesWastage: f.wastage,
      positiveAdjustments: f.pos,
      negativeAdjustments: f.neg,
      expiringUnder6Months: expiringByItem.get(itemId) ?? 0,
      computedExpectedBalance,
    });
  }

  return result;
}

export type SavedLabStockCheck = DailyCheckPrefill & {
  quantityUsedIsManual: boolean;
  testsDone: number;
  qaqcRepeats: number;
  stockedOutQty: number;
  physicalCount: number;
  quantityRequiredSupply: number;
  notes: string | null;
};

export async function getSavedChecksForDate(itemIds: string[], date: string): Promise<Map<string, SavedLabStockCheck>> {
  const result = new Map<string, SavedLabStockCheck>();
  if (itemIds.length === 0) return result;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("edoslmis_lab_stock_checks")
    .select(
      "item_id, beginning_balance, qty_received, qty_received_other_sources, quantity_used, quantity_used_is_manual, losses_wastage, positive_adjustments, negative_adjustments, expiring_under_6months, computed_expected_balance, tests_done, qaqc_repeats, stocked_out_qty, physical_count, quantity_required_supply, notes"
    )
    .in("item_id", itemIds)
    .eq("check_date", date);

  if (error) console.error("getSavedChecksForDate: query failed", error);

  for (const row of data ?? []) {
    result.set(row.item_id, {
      itemId: row.item_id,
      beginningBalance: Number(row.beginning_balance),
      qtyReceived: Number(row.qty_received),
      qtyReceivedOtherSources: Number(row.qty_received_other_sources),
      quantityUsed: Number(row.quantity_used),
      quantityUsedIsManual: row.quantity_used_is_manual,
      lossesWastage: Number(row.losses_wastage),
      positiveAdjustments: Number(row.positive_adjustments),
      negativeAdjustments: Number(row.negative_adjustments),
      expiringUnder6Months: Number(row.expiring_under_6months),
      computedExpectedBalance: Number(row.computed_expected_balance),
      testsDone: Number(row.tests_done),
      qaqcRepeats: Number(row.qaqc_repeats),
      stockedOutQty: Number(row.stocked_out_qty),
      physicalCount: Number(row.physical_count),
      quantityRequiredSupply: Number(row.quantity_required_supply),
      notes: row.notes,
    });
  }
  return result;
}

export type EstimatedManualRevenueLine = {
  itemId: string;
  itemCode: string;
  itemName: string;
  category: string;
  testName: string;
  quantityUsed: number;
  unitPrice: number;
  amount: number;
};

export type EstimatedManualRevenueByCategory = {
  category: string;
  amount: number;
  lines: EstimatedManualRevenueLine[];
};

export type EstimatedManualRevenue = {
  amount: number;
  itemsIncluded: number;
  itemsExcluded: number;
  byCategory: EstimatedManualRevenueByCategory[];
};

/**
 * Manual-entry commodities have no patient, order, or test attached — only a
 * raw quantity posted against a reagent via Record Stock Movement — so
 * there's no way to generate a real, chargeable invoice from them. This is a
 * display-only estimate for the dashboard: quantity deducted via
 * manual_usage ledger transactions x the price of whichever single test
 * consumes that reagent, ONLY for commodities that map to exactly one test in
 * edoslmis_test_reagent_usage. Commodities used by zero or multiple tests are
 * excluded (ambiguous which test to price it as) and counted in
 * itemsExcluded so the dashboard can disclose the estimate isn't exhaustive.
 * Reading straight from the ledger (rather than the Daily Stock Check report
 * table) means this is complete regardless of whether anyone ever opens the
 * Daily Check page for the item/date in question. Broken down by inventory
 * category (the grouping already built into the commodity model) so the
 * estimate reads as "per commodity / per test / per category", not one
 * undifferentiated number. This never touches
 * edoslmis_invoices/edoslmis_payments — real revenue figures are computed
 * exactly as before.
 */
export async function getEstimatedManualRevenue(from: string, to: string): Promise<EstimatedManualRevenue> {
  const supabase = await createClient();

  const { data: manualItems } = await supabase
    .from("edoslmis_inventory_items")
    .select("id, code, name, category")
    .eq("is_active", true)
    .eq("tracking_mode", "manual_entry");
  const items = manualItems ?? [];
  const manualItemIds = items.map((i) => i.id as string);
  if (manualItemIds.length === 0) return { amount: 0, itemsIncluded: 0, itemsExcluded: 0, byCategory: [] };

  const { data: usageRows } = await supabase
    .from("edoslmis_test_reagent_usage")
    .select("item_id, test_id, edoslmis_tests(name, price)")
    .in("item_id", manualItemIds);

  const testsByItem = new Map<string, Set<string>>();
  const testInfoByItem = new Map<string, { testName: string; unitPrice: number }>();
  for (const row of usageRows ?? []) {
    const set = testsByItem.get(row.item_id) ?? new Set<string>();
    set.add(row.test_id);
    testsByItem.set(row.item_id, set);
    const test = row.edoslmis_tests as unknown as { name: string; price: number } | { name: string; price: number }[] | null;
    const t = Array.isArray(test) ? test[0] : test;
    testInfoByItem.set(row.item_id, { testName: t?.name ?? "-", unitPrice: Number(t?.price ?? 0) });
  }

  const eligibleItemIds = manualItemIds.filter((id) => testsByItem.get(id)?.size === 1);
  const itemsExcluded = manualItemIds.length - eligibleItemIds.length;
  if (eligibleItemIds.length === 0) return { amount: 0, itemsIncluded: 0, itemsExcluded, byCategory: [] };

  const { data: usageTx } = await supabase
    .from("edoslmis_stock_transactions")
    .select("item_id, quantity_change")
    .in("item_id", eligibleItemIds)
    .eq("transaction_type", "manual_usage")
    .gte("performed_at", `${from}T00:00:00.000Z`)
    .lt("performed_at", `${addDaysStr(to, 1)}T00:00:00.000Z`);

  const quantityUsedByItem = new Map<string, number>();
  for (const row of usageTx ?? []) {
    quantityUsedByItem.set(row.item_id, (quantityUsedByItem.get(row.item_id) ?? 0) + Math.abs(Number(row.quantity_change)));
  }

  const categoryMap = new Map<string, EstimatedManualRevenueByCategory>();
  let amount = 0;
  for (const item of items) {
    if (!eligibleItemIds.includes(item.id)) continue;
    const quantityUsed = quantityUsedByItem.get(item.id) ?? 0;
    if (quantityUsed <= 0) continue;

    const { testName, unitPrice } = testInfoByItem.get(item.id) ?? { testName: "-", unitPrice: 0 };
    const lineAmount = quantityUsed * unitPrice;
    amount += lineAmount;

    const bucket: EstimatedManualRevenueByCategory =
      categoryMap.get(item.category) ?? { category: item.category, amount: 0, lines: [] };
    bucket.amount += lineAmount;
    bucket.lines.push({
      itemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      category: item.category,
      testName,
      quantityUsed,
      unitPrice,
      amount: lineAmount,
    });
    categoryMap.set(item.category, bucket);
  }

  const byCategory = [...categoryMap.values()]
    .map((bucket) => ({ ...bucket, lines: bucket.lines.sort((a, b) => b.amount - a.amount) }))
    .sort((a, b) => b.amount - a.amount);

  return { amount, itemsIncluded: eligibleItemIds.length, itemsExcluded, byCategory };
}

export type LabStockReportRow = {
  itemId: string;
  code: string;
  name: string;
  unitOfMeasure: string;
  reorderLevel: number;
  departmentName: string | null;
  beginningBalance: number;
  qtyReceived: number;
  qtyReceivedOtherSources: number;
  quantityUsed: number;
  testsDone: number;
  qaqcRepeats: number;
  lossesWastage: number;
  positiveAdjustments: number;
  negativeAdjustments: number;
  expiringUnder6Months: number;
  stockedOutQty: number;
  physicalCount: number;
  quantityRequiredSupply: number;
  hasDiscrepancy: boolean;
  hasEntries: boolean;
  dailyRows: Array<{
    checkDate: string;
    beginningBalance: number;
    qtyReceived: number;
    quantityUsed: number;
    quantityUsedIsManual: boolean;
    physicalCount: number;
    computedExpectedBalance: number;
  }>;
};

export async function getLabStockReport(
  from: string,
  to: string,
  departmentId?: string
): Promise<{ rows: LabStockReportRow[]; error: string | null }> {
  const supabase = await createClient();

  let itemsQuery = supabase
    .from("edoslmis_inventory_items")
    .select("id, code, name, unit_of_measure, reorder_level, department_id, edoslmis_departments(name)")
    .eq("is_active", true)
    .order("name");
  if (departmentId) itemsQuery = itemsQuery.eq("department_id", departmentId);

  const { data: items, error: itemsError } = await itemsQuery;
  if (itemsError) {
    console.error("getLabStockReport: failed to load inventory items", itemsError);
    return { rows: [], error: itemsError.message };
  }
  if (!items || items.length === 0) return { rows: [], error: null };

  const itemIds = items.map((i) => i.id);

  const { data: checks, error: checksError } = await supabase
    .from("edoslmis_lab_stock_checks")
    .select(
      "item_id, check_date, beginning_balance, qty_received, qty_received_other_sources, quantity_used, quantity_used_is_manual, tests_done, qaqc_repeats, losses_wastage, positive_adjustments, negative_adjustments, expiring_under_6months, stocked_out_qty, physical_count, quantity_required_supply, computed_expected_balance"
    )
    .in("item_id", itemIds)
    .gte("check_date", from)
    .lte("check_date", to)
    .order("check_date", { ascending: true });

  if (checksError) {
    console.error("getLabStockReport: failed to load lab stock checks", checksError);
    return { rows: [], error: checksError.message };
  }

  const byItem = new Map<string, NonNullable<typeof checks>>();
  for (const row of checks ?? []) {
    const list = byItem.get(row.item_id) ?? [];
    list.push(row);
    byItem.set(row.item_id, list);
  }

  const sum = (rows: NonNullable<typeof checks>, key: string) =>
    rows.reduce((s, r) => s + Number((r as unknown as Record<string, number>)[key]), 0);

  const rows = items.map((item) => {
    const itemRows = byItem.get(item.id) ?? [];
    const dept = item.edoslmis_departments as unknown as { name: string } | null;
    const first = itemRows[0];
    const last = itemRows[itemRows.length - 1];
    const physicalCount = last ? Number(last.physical_count) : 0;
    const expected = last ? Number(last.computed_expected_balance) : 0;

    return {
      itemId: item.id,
      code: item.code,
      name: item.name,
      unitOfMeasure: item.unit_of_measure,
      reorderLevel: Number(item.reorder_level),
      departmentName: dept?.name ?? null,
      beginningBalance: first ? Number(first.beginning_balance) : 0,
      qtyReceived: sum(itemRows, "qty_received"),
      qtyReceivedOtherSources: sum(itemRows, "qty_received_other_sources"),
      quantityUsed: sum(itemRows, "quantity_used"),
      testsDone: sum(itemRows, "tests_done"),
      qaqcRepeats: sum(itemRows, "qaqc_repeats"),
      lossesWastage: sum(itemRows, "losses_wastage"),
      positiveAdjustments: sum(itemRows, "positive_adjustments"),
      negativeAdjustments: sum(itemRows, "negative_adjustments"),
      expiringUnder6Months: last ? Number(last.expiring_under_6months) : 0,
      stockedOutQty: sum(itemRows, "stocked_out_qty"),
      physicalCount,
      quantityRequiredSupply: last ? Number(last.quantity_required_supply) : 0,
      hasDiscrepancy: itemRows.length > 0 && Math.abs(physicalCount - expected) > 0.01,
      hasEntries: itemRows.length > 0,
      dailyRows: itemRows.map((r) => ({
        checkDate: r.check_date,
        beginningBalance: Number(r.beginning_balance),
        qtyReceived: Number(r.qty_received),
        quantityUsed: Number(r.quantity_used),
        quantityUsedIsManual: r.quantity_used_is_manual,
        physicalCount: Number(r.physical_count),
        computedExpectedBalance: Number(r.computed_expected_balance),
      })),
    };
  });

  return { rows, error: null };
}

export async function getDailyUsageTrend(
  from: string,
  to: string,
  departmentId?: string
): Promise<{ labels: string[]; values: number[] }> {
  const supabase = await createClient();
  let query = supabase
    .from("edoslmis_lab_stock_checks")
    .select("check_date, quantity_used, edoslmis_inventory_items!inner(department_id)")
    .gte("check_date", from)
    .lte("check_date", to);
  if (departmentId) query = query.eq("edoslmis_inventory_items.department_id", departmentId);
  const { data } = await query;

  const buckets: Record<string, number> = {};
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 370) {
    buckets[cursor] = 0;
    cursor = addDaysStr(cursor, 1);
    guard++;
  }
  for (const row of data ?? []) {
    if (row.check_date in buckets) buckets[row.check_date] += Number(row.quantity_used);
  }
  const labels = Object.keys(buckets);
  return { labels, values: labels.map((l) => buckets[l]) };
}
