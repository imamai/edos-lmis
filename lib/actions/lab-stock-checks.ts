"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { getDailyCheckPrefill } from "@/lib/data/lab-stock-checks";
import { revalidatePath } from "next/cache";

export async function saveDailyLabStockChecks(_prevState: { error: string | null } | null, formData: FormData) {
  const date = String(formData.get("check_date") ?? "").trim();
  const itemIds = formData.getAll("item_id").map(String).filter(Boolean);

  if (!date || itemIds.length === 0) {
    return { error: "Nothing to save." };
  }

  const staff = await getCurrentStaff();
  const supabase = await createClient();
  const prefillMap = await getDailyCheckPrefill(itemIds, date);

  const rows = itemIds.map((itemId) => {
    const prefill = prefillMap.get(itemId);
    const num = (name: string) => Number(formData.get(`${name}__${itemId}`) ?? 0) || 0;
    const notes = String(formData.get(`notes__${itemId}`) ?? "").trim() || null;

    const quantityUsedIsManual = formData.get(`quantity_used_is_manual__${itemId}`) === "1";
    // When not a deliberate override, always persist the freshly-derived ledger
    // value (ignore whatever the client happened to submit) so this date keeps
    // tracking live even if a later ledger correction changes the auto figure.
    // Manual-tracking commodities are deducted via Record Stock Movement
    // (manual_usage transactions) instead, so their Quantity Used is just as
    // ledger-derived as an order-driven item's — this override is a display
    // annotation only, same as it's always been, and never writes the ledger.
    const quantityUsed = quantityUsedIsManual
      ? Number(formData.get(`quantity_used__${itemId}`) ?? 0) || 0
      : prefill?.quantityUsed ?? 0;

    const beginningBalance = prefill?.beginningBalance ?? 0;
    const qtyReceived = prefill?.qtyReceived ?? 0;
    const qtyReceivedOtherSources = prefill?.qtyReceivedOtherSources ?? 0;
    const lossesWastage = prefill?.lossesWastage ?? 0;
    const positiveAdjustments = prefill?.positiveAdjustments ?? 0;
    const negativeAdjustments = prefill?.negativeAdjustments ?? 0;
    const computedExpectedBalance =
      beginningBalance + qtyReceived + qtyReceivedOtherSources - quantityUsed - lossesWastage + positiveAdjustments - negativeAdjustments;

    return {
      tenant_id: staff.tenantId,
      branch_id: staff.branchId,
      item_id: itemId,
      check_date: date,
      beginning_balance: beginningBalance,
      qty_received: qtyReceived,
      qty_received_other_sources: qtyReceivedOtherSources,
      quantity_used: quantityUsed,
      quantity_used_is_manual: quantityUsedIsManual,
      losses_wastage: lossesWastage,
      positive_adjustments: positiveAdjustments,
      negative_adjustments: negativeAdjustments,
      expiring_under_6months: prefill?.expiringUnder6Months ?? 0,
      computed_expected_balance: computedExpectedBalance,
      tests_done: num("tests_done"),
      qaqc_repeats: num("qaqc_repeats"),
      stocked_out_qty: num("stocked_out_qty"),
      // A real shelf count — independent of the computed figure above, since
      // the entire point is to be able to catch when they disagree.
      physical_count: num("physical_count"),
      quantity_required_supply: num("quantity_required_supply"),
      notes,
      performed_by: staff.userId,
    };
  });

  const { error } = await supabase.from("edoslmis_lab_stock_checks").upsert(rows, { onConflict: "tenant_id,item_id,check_date" });
  if (error) return { error: error.message };

  revalidatePath("/inventory/daily-check");
  revalidatePath("/reports/lab-stock");
  revalidatePath("/inventory");
  return { error: null };
}
