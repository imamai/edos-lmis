"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { checkLowStockAndNotify } from "@/lib/notifications/inventory-alerts";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { EDITABLE_STOCK_TRANSACTION_TYPES } from "@/lib/inventory-constants";

export async function createInventoryItem(_prevState: { error: string } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!code || !name) return { error: "Code and name are required." };

  const { data: item, error } = await supabase
    .from("edoslmis_inventory_items")
    .insert({
      tenant_id: staff.tenantId,
      branch_id: staff.branchId,
      department_id: String(formData.get("department_id") ?? "") || null,
      category: String(formData.get("category") ?? "reagent"),
      code,
      name,
      unit_of_measure: String(formData.get("unit_of_measure") ?? "unit"),
      reorder_level: Number(formData.get("reorder_level") ?? 0),
      tracking_mode: String(formData.get("tracking_mode") ?? "order_driven"),
      created_by: staff.userId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const openingQty = Number(formData.get("opening_quantity") ?? 0);
  if (openingQty !== 0) {
    const { error: txError } = await supabase.rpc("edoslmis_record_stock_transaction", {
      p_item_id: item.id,
      p_transaction_type: "opening_balance",
      p_quantity_change: openingQty,
      p_batch_id: null,
      p_reference_order_test_id: null,
      p_notes: "Initial stock setup",
    });
    if (txError) return { error: txError.message };
  }

  redirect(`/inventory/${item.id}`);
}

const adjustmentTypeForDirection: Record<string, string> = {
  receipt: "receipt",
  manual_usage: "manual_usage",
  positive_adjustment: "positive_adjustment",
  negative_adjustment: "negative_adjustment",
  wastage: "wastage",
  expiry: "expiry",
  stock_count_correction: "stock_count_correction",
};

export async function recordStockMovement(
  _prevState: { error: string | null } | null,
  formData: FormData
) {
  const itemId = String(formData.get("item_id") ?? "");
  const type = String(formData.get("transaction_type") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const date = String(formData.get("performed_at") ?? "").trim() || null;

  if (!itemId || !type || !quantity) {
    return { error: "Select a movement type and enter a non-zero quantity." };
  }

  const resolvedType = adjustmentTypeForDirection[type];
  if (!resolvedType) return { error: "Invalid movement type." };

  const isOutbound = ["negative_adjustment", "wastage", "expiry", "manual_usage"].includes(resolvedType);
  // Stock count correction can go either way (a physical count can come in
  // over or under what the ledger expects) — respect whatever sign was
  // entered instead of always forcing it positive.
  const signedQuantity =
    resolvedType === "stock_count_correction" ? quantity : isOutbound ? -Math.abs(quantity) : Math.abs(quantity);

  const supabase = await createClient();
  const { error } = await supabase.rpc("edoslmis_record_stock_transaction", {
    p_item_id: itemId,
    p_transaction_type: resolvedType,
    p_quantity_change: signedQuantity,
    p_batch_id: null,
    p_reference_order_test_id: null,
    p_notes: notes,
    p_performed_at: date,
  });

  if (error) return { error: error.message };

  if (isOutbound) {
    const staff = await getCurrentStaff();
    await checkLowStockAndNotify(itemId, staff.tenantId);
  }

  revalidatePath(`/inventory/${itemId}`);
  revalidatePath("/inventory");
  return { error: null };
}

export async function postStockCountCorrection(itemId: string, checkDate: string): Promise<{ error: string | null }> {
  await getCurrentStaff();
  const supabase = await createClient();

  // Never trust a client-submitted discrepancy amount — always re-derive it
  // from the saved, confirmed daily check row. This also means a correction
  // can only be posted once the day's check has actually been saved, and
  // only while Quantity Used is ledger-derived (never while manually
  // overridden, since Expected Balance isn't ledger-verified in that state).
  const { data: saved, error: fetchError } = await supabase
    .from("edoslmis_lab_stock_checks")
    .select("quantity_used_is_manual, physical_count, computed_expected_balance")
    .eq("item_id", itemId)
    .eq("check_date", checkDate)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!saved) return { error: "Save this day's check before posting a correction." };
  if (saved.quantity_used_is_manual) {
    return { error: "Quantity Used is manually overridden for this date — revert it to auto before posting a correction." };
  }

  const differenceQuantity = Number(saved.physical_count) - Number(saved.computed_expected_balance);
  if (Math.abs(differenceQuantity) < 0.01) return { error: "No discrepancy to correct." };

  const { error } = await supabase.rpc("edoslmis_record_stock_transaction", {
    p_item_id: itemId,
    p_transaction_type: "stock_count_correction",
    p_quantity_change: differenceQuantity,
    p_batch_id: null,
    p_reference_order_test_id: null,
    p_notes: `Stock count correction from daily check on ${checkDate}`,
  });
  if (error) return { error: error.message };

  revalidatePath(`/inventory/${itemId}`);
  revalidatePath("/inventory");
  revalidatePath("/inventory/daily-check");
  revalidatePath("/reports/lab-stock");
  return { error: null };
}

const outboundStockTransactionTypes = new Set(["negative_adjustment", "wastage", "expiry", "manual_usage"]);

export async function updateStockTransaction(
  _prevState: { error: string | null } | null,
  formData: FormData
) {
  const transactionId = String(formData.get("transaction_id") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  const type = String(formData.get("transaction_type") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!transactionId || !itemId || !type || !quantity) {
    return { error: "Select a movement type and enter a non-zero quantity." };
  }
  if (!(EDITABLE_STOCK_TRANSACTION_TYPES as readonly string[]).includes(type)) {
    return { error: "This movement type can't be edited here." };
  }

  await getCurrentStaff();
  const supabase = await createClient();

  const signedQuantity = outboundStockTransactionTypes.has(type) ? -Math.abs(quantity) : Math.abs(quantity);

  const { error } = await supabase.rpc("edoslmis_update_stock_transaction", {
    p_transaction_id: transactionId,
    p_transaction_type: type,
    p_quantity_change: signedQuantity,
    p_notes: notes,
  });

  if (error) return { error: error.message };

  revalidatePath(`/inventory/${itemId}`);
  revalidatePath("/inventory");
  return { error: null };
}

export async function deleteStockTransaction(transactionId: string, itemId: string) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.rpc("edoslmis_delete_stock_transaction", {
    p_transaction_id: transactionId,
  });
  if (error) return { error: error.message };

  revalidatePath(`/inventory/${itemId}`);
  revalidatePath("/inventory");
  return { error: null };
}

export async function updateInventoryItem(_prevState: { error: string } | null, formData: FormData) {
  await getCurrentStaff();
  const supabase = await createClient();

  const itemId = String(formData.get("item_id") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!code || !name) return { error: "Code and name are required." };

  const { error } = await supabase
    .from("edoslmis_inventory_items")
    .update({
      department_id: String(formData.get("department_id") ?? "") || null,
      category: String(formData.get("category") ?? "reagent"),
      code,
      name,
      unit_of_measure: String(formData.get("unit_of_measure") ?? "unit"),
      reorder_level: Number(formData.get("reorder_level") ?? 0),
      tracking_mode: String(formData.get("tracking_mode") ?? "order_driven"),
    })
    .eq("id", itemId);

  if (error) return { error: error.message };

  redirect(`/inventory/${itemId}`);
}

export async function deleteInventoryItem(itemId: string) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_inventory_items").delete().eq("id", itemId);
  if (error) {
    if (error.code === "23503") {
      return { error: "This commodity has stock or purchase history and can't be deleted — deactivate it instead." };
    }
    return { error: error.message };
  }

  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function setInventoryItemActive(itemId: string, isActive: boolean) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase
    .from("edoslmis_inventory_items")
    .update({ is_active: isActive })
    .eq("id", itemId);

  if (error) return { error: error.message };

  revalidatePath(`/inventory/${itemId}`);
  revalidatePath("/inventory");
  return { error: null };
}

export async function updateStockBatch(_prevState: { error: string | null } | null, formData: FormData) {
  await getCurrentStaff();
  const supabase = await createClient();

  const batchId = String(formData.get("batch_id") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  const batchNumber = String(formData.get("batch_number") ?? "").trim();
  if (!batchId || !batchNumber) return { error: "Batch number is required." };

  const supplierName = String(formData.get("supplier_name") ?? "").trim() || null;
  const expiryDate = String(formData.get("expiry_date") ?? "").trim() || null;
  const unitCostRaw = String(formData.get("unit_cost") ?? "").trim();
  const unitCost = unitCostRaw === "" ? null : Number(unitCostRaw);
  const quantityRemaining = Number(formData.get("quantity_remaining") ?? 0);

  if (quantityRemaining < 0) return { error: "Quantity remaining can't be negative." };

  const { error } = await supabase
    .from("edoslmis_stock_batches")
    .update({
      batch_number: batchNumber,
      supplier_name: supplierName,
      expiry_date: expiryDate,
      unit_cost: unitCost,
      quantity_remaining: quantityRemaining,
    })
    .eq("id", batchId);

  if (error) return { error: error.message };

  revalidatePath(`/inventory/${itemId}`);
  revalidatePath("/inventory/daily-check");
  revalidatePath("/reports/lab-stock");
  return { error: null };
}

export async function setStockBatchActive(batchId: string, itemId: string, isActive: boolean) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_stock_batches").update({ is_active: isActive }).eq("id", batchId);
  if (error) return { error: error.message };

  revalidatePath(`/inventory/${itemId}`);
  revalidatePath("/inventory/daily-check");
  revalidatePath("/reports/lab-stock");
  return { error: null };
}
