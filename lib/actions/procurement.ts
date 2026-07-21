"use server";

import { createElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { getTenantSettings } from "@/lib/data/settings";
import { getPurchaseOrder, getRfq } from "@/lib/data/procurement";
import { sendNotification } from "@/lib/notifications";
import { renderPdf } from "@/lib/pdf/render";
import { PurchaseOrderDocument } from "@/lib/pdf/purchase-order-document";
import { RfqDocument } from "@/lib/pdf/rfq-document";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type PoLineInput = { item_id: string; quantity_ordered: number; unit_cost: number | null };

// Shared by createPurchaseOrder (blank form) and convertRfqToPurchaseOrder
// (pre-filled from an RFQ's lines/quote) — both need the same
// number-generate + header-insert + lines-insert sequence.
async function insertDraftPurchaseOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  staff: { tenantId: string; branchId: string | null; userId: string },
  supplierId: string,
  lines: PoLineInput[],
  expectedDate: string | null,
  notes: string | null
): Promise<{ id: string } | { error: string }> {
  const { data: poNumber, error: numberError } = await supabase.rpc("edoslmis_generate_po_number");
  if (numberError) return { error: numberError.message };

  const { data: po, error: poError } = await supabase
    .from("edoslmis_purchase_orders")
    .insert({
      tenant_id: staff.tenantId,
      branch_id: staff.branchId,
      po_number: poNumber as string,
      supplier_id: supplierId,
      expected_date: expectedDate,
      notes,
      created_by: staff.userId,
    })
    .select("id")
    .single();
  if (poError) return { error: poError.message };

  const { error: linesError } = await supabase.from("edoslmis_purchase_order_lines").insert(
    lines.map((l) => ({
      tenant_id: staff.tenantId,
      po_id: po.id,
      item_id: l.item_id,
      quantity_ordered: l.quantity_ordered,
      unit_cost: l.unit_cost,
    }))
  );
  if (linesError) return { error: linesError.message };

  return { id: po.id as string };
}

export async function createSupplier(_prevState: { error: string } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Supplier name is required." };

  const { data: supplier, error } = await supabase
    .from("edoslmis_suppliers")
    .insert({
      tenant_id: staff.tenantId,
      name,
      contact_person: String(formData.get("contact_person") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      payment_terms: String(formData.get("payment_terms") ?? "").trim() || null,
      bank_details: String(formData.get("bank_details") ?? "").trim() || null,
      created_by: staff.userId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  redirect(`/suppliers/${supplier.id}`);
}

export async function updateSupplier(_prevState: { error: string } | null, formData: FormData) {
  await getCurrentStaff();
  const supabase = await createClient();

  const supplierId = String(formData.get("supplier_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Supplier name is required." };

  const { error } = await supabase
    .from("edoslmis_suppliers")
    .update({
      name,
      contact_person: String(formData.get("contact_person") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      address: String(formData.get("address") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      payment_terms: String(formData.get("payment_terms") ?? "").trim() || null,
      bank_details: String(formData.get("bank_details") ?? "").trim() || null,
    })
    .eq("id", supplierId);

  if (error) return { error: error.message };

  redirect(`/suppliers/${supplierId}`);
}

export async function deleteSupplier(supplierId: string) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_suppliers").delete().eq("id", supplierId);
  if (error) {
    if (error.code === "23503") {
      return { error: "This supplier has purchase orders on file and can't be deleted — deactivate it instead." };
    }
    return { error: error.message };
  }

  revalidatePath("/suppliers");
  redirect("/suppliers");
}

export async function setSupplierActive(supplierId: string, isActive: boolean) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase
    .from("edoslmis_suppliers")
    .update({ is_active: isActive })
    .eq("id", supplierId);

  if (error) return { error: error.message };
  revalidatePath(`/suppliers/${supplierId}`);
  revalidatePath("/suppliers");
  return { error: null };
}

export async function createSupplierCatalogItem(_prevState: { error: string | null } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const supplierId = String(formData.get("supplier_id") ?? "");
  const itemId = String(formData.get("item_id") ?? "");
  const unitPrice = Number(formData.get("unit_price") ?? 0);
  if (!supplierId || !itemId || unitPrice <= 0) {
    return { error: "Select a commodity and enter a price greater than zero." };
  }

  const { error } = await supabase.from("edoslmis_supplier_catalog_items").upsert(
    {
      tenant_id: staff.tenantId,
      supplier_id: supplierId,
      item_id: itemId,
      unit_price: unitPrice,
      supplier_sku: String(formData.get("supplier_sku") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      created_by: staff.userId,
    },
    { onConflict: "tenant_id,supplier_id,item_id" }
  );
  if (error) return { error: error.message };

  revalidatePath(`/suppliers/${supplierId}`);
  return { error: null };
}

export async function deleteSupplierCatalogItem(catalogItemId: string, supplierId: string) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_supplier_catalog_items").delete().eq("id", catalogItemId);
  if (error) return { error: error.message };

  revalidatePath(`/suppliers/${supplierId}`);
  return { error: null };
}

export async function createPurchaseOrder(_prevState: { error: string } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const supplierId = String(formData.get("supplier_id") ?? "");
  if (!supplierId) return { error: "Select a supplier." };

  const itemIds = formData.getAll("item_id").map(String);
  const lines: { item_id: string; quantity_ordered: number; unit_cost: number | null }[] = [];
  for (const itemId of itemIds) {
    const qty = Number(formData.get(`quantity__${itemId}`) ?? 0);
    if (!qty || qty <= 0) continue;
    const costRaw = formData.get(`unit_cost__${itemId}`);
    lines.push({
      item_id: itemId,
      quantity_ordered: qty,
      unit_cost: costRaw && String(costRaw).trim() !== "" ? Number(costRaw) : null,
    });
  }
  if (lines.length === 0) return { error: "Enter a quantity for at least one commodity." };

  const expectedDate = String(formData.get("expected_date") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const result = await insertDraftPurchaseOrder(supabase, staff, supplierId, lines, expectedDate, notes);
  if ("error" in result) return { error: result.error };

  redirect(`/purchase-orders/${result.id}`);
}

export async function updatePurchaseOrder(_prevState: { error: string } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const poId = String(formData.get("po_id") ?? "");
  const supplierId = String(formData.get("supplier_id") ?? "");
  if (!poId || !supplierId) return { error: "Select a supplier." };

  const itemIds = formData.getAll("item_id").map(String);
  const lines: { item_id: string; quantity_ordered: number; unit_cost: number | null }[] = [];
  for (const itemId of itemIds) {
    const qty = Number(formData.get(`quantity__${itemId}`) ?? 0);
    if (!qty || qty <= 0) continue;
    const costRaw = formData.get(`unit_cost__${itemId}`);
    lines.push({
      item_id: itemId,
      quantity_ordered: qty,
      unit_cost: costRaw && String(costRaw).trim() !== "" ? Number(costRaw) : null,
    });
  }
  if (lines.length === 0) return { error: "Enter a quantity for at least one commodity." };

  const expectedDate = String(formData.get("expected_date") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  // Editable while draft/sent/confirmed — not once receiving has started
  // (partially_received/received), since replacing the line set would
  // conflict with quantity_received already posted to the stock ledger.
  // Correcting an already-sent PO bumps `revision` so staff know to resend.
  const { data: current, error: currentError } = await supabase
    .from("edoslmis_purchase_orders")
    .select("status, revision")
    .eq("id", poId)
    .in("status", ["draft", "sent", "confirmed"])
    .single();
  if (currentError) return { error: "This purchase order can no longer be edited." };

  const { error: poError } = await supabase
    .from("edoslmis_purchase_orders")
    .update({
      supplier_id: supplierId,
      expected_date: expectedDate,
      notes,
      ...(current.status !== "draft"
        ? { revision: current.revision + 1, corrected_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", poId);
  if (poError) return { error: poError.message };

  const { error: deleteError } = await supabase.from("edoslmis_purchase_order_lines").delete().eq("po_id", poId);
  if (deleteError) return { error: deleteError.message };

  const { error: linesError } = await supabase.from("edoslmis_purchase_order_lines").insert(
    lines.map((l) => ({
      tenant_id: staff.tenantId,
      po_id: poId,
      item_id: l.item_id,
      quantity_ordered: l.quantity_ordered,
      unit_cost: l.unit_cost,
    }))
  );
  if (linesError) return { error: linesError.message };

  redirect(`/purchase-orders/${poId}`);
}

// Consolidates what used to be three separate inline "Correct" controls
// (order date, supplier invoice number, and one per received line) into a
// single popup covering everything that might need fixing on a PO after
// the fact, submitted together in one go.
export async function correctPurchaseOrder(
  _prevState: { error: string | null } | null,
  formData: FormData
) {
  const poId = String(formData.get("po_id") ?? "");
  if (!poId) return { error: "Missing purchase order." };

  const orderDate = String(formData.get("order_date") ?? "").trim();
  if (!orderDate) return { error: "Enter an order date." };
  const supplierInvoiceNumber = String(formData.get("supplier_invoice_number") ?? "").trim() || null;
  const reason = String(formData.get("reason") ?? "").trim();

  const lineIds = formData.getAll("line_id").map(String);
  const submittedLines: { lineId: string; quantity: number; unitCost: number | null }[] = [];
  for (const lineId of lineIds) {
    const qtyRaw = String(formData.get(`quantity__${lineId}`) ?? "").trim();
    if (qtyRaw === "") continue;
    const qty = Number(qtyRaw);
    if (Number.isNaN(qty) || qty < 0) return { error: "Enter a valid received quantity for every line." };
    const costRaw = String(formData.get(`unit_cost__${lineId}`) ?? "").trim();
    const unitCost = costRaw === "" ? null : Number(costRaw);
    if (unitCost !== null && (Number.isNaN(unitCost) || unitCost < 0)) {
      return { error: "Enter a valid unit cost for every line." };
    }
    submittedLines.push({ lineId, quantity: qty, unitCost });
  }

  await getCurrentStaff();
  const supabase = await createClient();

  const { error: currentError } = await supabase
    .from("edoslmis_purchase_orders")
    .select("id")
    .eq("id", poId)
    .neq("status", "cancelled")
    .single();
  if (currentError) return { error: "This purchase order is cancelled and can no longer be edited." };

  const { error: dateError } = await supabase
    .from("edoslmis_purchase_orders")
    .update({ order_date: orderDate })
    .eq("id", poId);
  if (dateError) return { error: dateError.message };

  const { error: invoiceError } = await supabase
    .from("edoslmis_purchase_orders")
    .update({ supplier_invoice_number: supplierInvoiceNumber })
    .eq("id", poId);
  if (invoiceError) return { error: invoiceError.message };

  // Carry the number over to the bill already generated for this PO (if
  // any) — the invoice usually arrives after the bill's been raised off the
  // GRN, so this is the only point where the two rows can be kept in sync.
  const { data: bill } = await supabase
    .from("edoslmis_supplier_bills")
    .select("id")
    .eq("po_id", poId)
    .neq("status", "cancelled")
    .maybeSingle();
  if (bill) {
    await supabase
      .from("edoslmis_supplier_bills")
      .update({ supplier_invoice_number: supplierInvoiceNumber })
      .eq("id", bill.id);
    revalidatePath(`/supplier-bills/${bill.id}`);
  }

  if (submittedLines.length > 0) {
    // Re-derive what actually changed from the DB rather than trusting
    // client-submitted "current" values, same defensiveness
    // postStockCountCorrection uses for its discrepancy amount — the RPC
    // itself also rejects a no-op call, so anything unchanged must be
    // filtered out before looping rather than left for it to reject.
    const { data: currentLines } = await supabase
      .from("edoslmis_purchase_order_lines")
      .select("id, quantity_received, unit_cost")
      .in("id", submittedLines.map((l) => l.lineId));
    const currentByLine = new Map((currentLines ?? []).map((l) => [l.id, l]));

    const changedLines = submittedLines.filter((l) => {
      const current = currentByLine.get(l.lineId);
      if (!current) return false;
      const currentCost = current.unit_cost === null ? null : Number(current.unit_cost);
      return Number(current.quantity_received) !== l.quantity || currentCost !== l.unitCost;
    });

    if (changedLines.length > 0 && !reason) {
      return { error: "Enter a reason for the quantity/cost corrections." };
    }

    for (const line of changedLines) {
      const { error } = await supabase.rpc("edoslmis_correct_purchase_order_line_receipt", {
        p_line_id: line.lineId,
        p_new_quantity_received: line.quantity,
        p_new_unit_cost: line.unitCost,
        p_reason: reason,
      });
      if (error) return { error: error.message };
    }

    revalidatePath("/inventory");
  }

  revalidatePath(`/purchase-orders/${poId}`);
  revalidatePath("/purchase-orders");
  return { error: null };
}

export async function deletePurchaseOrder(poId: string) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("edoslmis_purchase_orders")
    .delete()
    .eq("id", poId)
    .eq("status", "draft")
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23503") {
      return { error: "This purchase order has related records and can't be deleted." };
    }
    return { error: error.message };
  }
  if (!data) return { error: "Only draft purchase orders can be deleted." };

  revalidatePath("/purchase-orders");
  redirect("/purchase-orders");
}

export async function sendPurchaseOrder(poId: string) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: po, error: poError } = await getPurchaseOrder(poId);
  if (poError) return { error: poError };
  if (!po) return { error: "Purchase order not found." };

  let emailed = false;
  let emailError: string | null = null;
  if (po.supplier?.email) {
    const settings = await getTenantSettings(staff.tenantId);
    const pdf = await renderPdf(createElement(PurchaseOrderDocument, { po, settings }));
    const result = await sendNotification(
      staff.tenantId,
      {
        channel: "email",
        recipient: po.supplier.email,
        subject: `Purchase Order ${po.po_number}`,
        message: `Please find attached Purchase Order ${po.po_number}${po.expected_date ? ` (expected ${po.expected_date})` : ""}.`,
        attachment: { filename: `${po.po_number}.pdf`, content: pdf, contentType: "application/pdf" },
        replyTo: settings.clinic_email ?? undefined,
        fromName: settings.clinic_name ?? undefined,
      },
      { table: "edoslmis_purchase_orders", id: poId }
    );
    emailed = result.ok;
    if (!result.ok) emailError = result.error ?? "Failed to send email.";
  }

  const { error } = await supabase
    .from("edoslmis_purchase_orders")
    .update({ status: "sent" })
    .eq("id", poId)
    .eq("status", "draft");

  if (error) return { error: error.message };
  revalidatePath(`/purchase-orders/${poId}`);
  revalidatePath("/purchase-orders");
  return {
    error: null,
    emailed,
    emailError,
    supplierEmail: po.supplier?.email ?? null,
  };
}

export async function resendPurchaseOrder(poId: string) {
  const staff = await getCurrentStaff();

  const { data: po, error: poError } = await getPurchaseOrder(poId);
  if (poError) return { error: poError };
  if (!po) return { error: "Purchase order not found." };
  if (po.revision === 0) return { error: "This purchase order has no corrections to resend." };
  if (!po.supplier?.email) return { error: "No supplier email on file — send the PDF manually." };

  const settings = await getTenantSettings(staff.tenantId);
  const pdf = await renderPdf(createElement(PurchaseOrderDocument, { po, settings }));
  const result = await sendNotification(
    staff.tenantId,
    {
      channel: "email",
      recipient: po.supplier.email,
      subject: `Revised Purchase Order ${po.po_number} — Rev. ${po.revision}`,
      message: `Please find attached a revised version (Rev. ${po.revision}) of Purchase Order ${po.po_number}, superseding the version sent earlier.`,
      attachment: { filename: `${po.po_number}-rev${po.revision}.pdf`, content: pdf, contentType: "application/pdf" },
      replyTo: settings.clinic_email ?? undefined,
      fromName: settings.clinic_name ?? undefined,
    },
    { table: "edoslmis_purchase_orders", id: poId }
  );

  if (!result.ok) return { error: result.error ?? "Failed to send email." };
  return { error: null, emailed: true, supplierEmail: po.supplier.email };
}

export async function confirmPurchaseOrder(poId: string) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase
    .from("edoslmis_purchase_orders")
    .update({ status: "confirmed" })
    .eq("id", poId)
    .eq("status", "sent");

  if (error) return { error: error.message };
  revalidatePath(`/purchase-orders/${poId}`);
  revalidatePath("/purchase-orders");
  return { error: null };
}

export async function cancelPurchaseOrder(poId: string, reason: string) {
  await getCurrentStaff();
  if (!reason.trim()) return { error: "Enter a cancellation reason." };
  const supabase = await createClient();

  const { error } = await supabase
    .from("edoslmis_purchase_orders")
    .update({ status: "cancelled", cancelled_reason: reason })
    .eq("id", poId)
    .in("status", ["draft", "sent", "confirmed"]);

  if (error) return { error: error.message };
  revalidatePath(`/purchase-orders/${poId}`);
  revalidatePath("/purchase-orders");
  return { error: null };
}

export async function receivePurchaseOrderLine(
  _prevState: { error: string | null } | null,
  formData: FormData
) {
  const lineId = String(formData.get("line_id") ?? "");
  const poId = String(formData.get("po_id") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);
  const batchNumber = String(formData.get("batch_number") ?? "").trim() || null;
  const expiryDate = String(formData.get("expiry_date") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!lineId || !quantity || quantity <= 0) {
    return { error: "Enter a quantity greater than zero." };
  }

  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.rpc("edoslmis_receive_purchase_order_line", {
    p_line_id: lineId,
    p_quantity: quantity,
    p_batch_number: batchNumber,
    p_expiry_date: expiryDate,
    p_notes: notes,
  });

  if (error) return { error: error.message };

  revalidatePath(`/purchase-orders/${poId}`);
  revalidatePath("/purchase-orders");
  revalidatePath("/inventory");
  return { error: null };
}

export async function createRfq(_prevState: { error: string } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const supplierIds = formData.getAll("supplier_id").map(String);
  if (supplierIds.length === 0) return { error: "Select at least one supplier." };

  const itemIds = formData.getAll("item_id").map(String);
  const lines: { item_id: string; quantity_requested: number }[] = [];
  for (const itemId of itemIds) {
    const qty = Number(formData.get(`quantity__${itemId}`) ?? 0);
    if (!qty || qty <= 0) continue;
    lines.push({ item_id: itemId, quantity_requested: qty });
  }
  if (lines.length === 0) return { error: "Enter a quantity for at least one commodity." };

  const { data: rfqNumber, error: numberError } = await supabase.rpc("edoslmis_generate_rfq_number");
  if (numberError) return { error: numberError.message };

  const expectedDate = String(formData.get("expected_date") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const { data: rfq, error: rfqError } = await supabase
    .from("edoslmis_rfqs")
    .insert({
      tenant_id: staff.tenantId,
      branch_id: staff.branchId,
      rfq_number: rfqNumber as string,
      expected_date: expectedDate,
      notes,
      created_by: staff.userId,
    })
    .select("id")
    .single();
  if (rfqError) return { error: rfqError.message };

  const { error: linesError } = await supabase.from("edoslmis_rfq_lines").insert(
    lines.map((l) => ({
      tenant_id: staff.tenantId,
      rfq_id: rfq.id,
      item_id: l.item_id,
      quantity_requested: l.quantity_requested,
    }))
  );
  if (linesError) return { error: linesError.message };

  const { error: suppliersError } = await supabase.from("edoslmis_rfq_suppliers").insert(
    supplierIds.map((supplierId) => ({
      tenant_id: staff.tenantId,
      rfq_id: rfq.id,
      supplier_id: supplierId,
    }))
  );
  if (suppliersError) return { error: suppliersError.message };

  redirect(`/rfqs/${rfq.id}`);
}

export async function updateRfq(_prevState: { error: string } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const rfqId = String(formData.get("rfq_id") ?? "");
  if (!rfqId) return { error: "Missing RFQ." };

  const itemIds = formData.getAll("item_id").map(String);
  const lines: { item_id: string; quantity_requested: number }[] = [];
  for (const itemId of itemIds) {
    const qty = Number(formData.get(`quantity__${itemId}`) ?? 0);
    if (!qty || qty <= 0) continue;
    lines.push({ item_id: itemId, quantity_requested: qty });
  }
  if (lines.length === 0) return { error: "Enter a quantity for at least one commodity." };

  const expectedDate = String(formData.get("expected_date") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  // Editable while draft/sent — not once closed/converted/cancelled.
  // Correcting an already-sent RFQ bumps `revision` so staff know to resend.
  const { data: current, error: currentError } = await supabase
    .from("edoslmis_rfqs")
    .select("status, revision")
    .eq("id", rfqId)
    .in("status", ["draft", "sent"])
    .single();
  if (currentError) return { error: "This RFQ can no longer be edited." };

  const { error: rfqError } = await supabase
    .from("edoslmis_rfqs")
    .update({
      expected_date: expectedDate,
      notes,
      ...(current.status !== "draft"
        ? { revision: current.revision + 1, corrected_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", rfqId);
  if (rfqError) return { error: rfqError.message };

  const { error: deleteError } = await supabase.from("edoslmis_rfq_lines").delete().eq("rfq_id", rfqId);
  if (deleteError) return { error: deleteError.message };

  const { error: linesError } = await supabase.from("edoslmis_rfq_lines").insert(
    lines.map((l) => ({
      tenant_id: staff.tenantId,
      rfq_id: rfqId,
      item_id: l.item_id,
      quantity_requested: l.quantity_requested,
    }))
  );
  if (linesError) return { error: linesError.message };

  redirect(`/rfqs/${rfqId}`);
}

export async function sendRfq(rfqId: string) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: rfq, error: rfqError } = await getRfq(rfqId);
  if (rfqError) return { error: rfqError };
  if (!rfq) return { error: "RFQ not found." };

  const settings = await getTenantSettings(staff.tenantId);
  const pdf = await renderPdf(createElement(RfqDocument, { rfq, settings }));

  let emailedCount = 0;
  let emailError: string | null = null;
  for (const entry of rfq.suppliers) {
    if (!entry.supplier?.email) continue;
    const result = await sendNotification(
      staff.tenantId,
      {
        channel: "email",
        recipient: entry.supplier.email,
        subject: `Request for Quotation ${rfq.rfq_number}`,
        message: `Please find attached Request for Quotation ${rfq.rfq_number}${rfq.expected_date ? ` (needed by ${rfq.expected_date})` : ""}.`,
        attachment: { filename: `${rfq.rfq_number}.pdf`, content: pdf, contentType: "application/pdf" },
        replyTo: settings.clinic_email ?? undefined,
        fromName: settings.clinic_name ?? undefined,
      },
      { table: "edoslmis_rfqs", id: rfqId }
    );
    if (result.ok) emailedCount++;
    else if (!emailError) emailError = result.error ?? "Failed to send email.";
  }

  const { error: markSentError } = await supabase
    .from("edoslmis_rfq_suppliers")
    .update({ sent_at: new Date().toISOString() })
    .eq("rfq_id", rfqId);
  if (markSentError) return { error: markSentError.message };

  const { error } = await supabase
    .from("edoslmis_rfqs")
    .update({ status: "sent" })
    .eq("id", rfqId)
    .eq("status", "draft");
  if (error) return { error: error.message };

  revalidatePath(`/rfqs/${rfqId}`);
  revalidatePath("/rfqs");
  return { error: null, emailedCount, emailError, supplierCount: rfq.suppliers.length };
}

export async function resendRfq(rfqId: string) {
  const staff = await getCurrentStaff();

  const { data: rfq, error: rfqError } = await getRfq(rfqId);
  if (rfqError) return { error: rfqError };
  if (!rfq) return { error: "RFQ not found." };
  if (rfq.revision === 0) return { error: "This RFQ has no corrections to resend." };

  const settings = await getTenantSettings(staff.tenantId);
  const pdf = await renderPdf(createElement(RfqDocument, { rfq, settings }));

  let emailedCount = 0;
  let emailError: string | null = null;
  for (const entry of rfq.suppliers) {
    if (!entry.supplier?.email) continue;
    const result = await sendNotification(
      staff.tenantId,
      {
        channel: "email",
        recipient: entry.supplier.email,
        subject: `Revised Request for Quotation ${rfq.rfq_number} — Rev. ${rfq.revision}`,
        message: `Please find attached a revised version (Rev. ${rfq.revision}) of Request for Quotation ${rfq.rfq_number}, superseding the version sent earlier.`,
        attachment: { filename: `${rfq.rfq_number}-rev${rfq.revision}.pdf`, content: pdf, contentType: "application/pdf" },
        replyTo: settings.clinic_email ?? undefined,
        fromName: settings.clinic_name ?? undefined,
      },
      { table: "edoslmis_rfqs", id: rfqId }
    );
    if (result.ok) emailedCount++;
    else if (!emailError) emailError = result.error ?? "Failed to send email.";
  }

  return { error: null, emailedCount, emailError, supplierCount: rfq.suppliers.length };
}

export async function recordRfqResponse(_prevState: { error: string | null } | null, formData: FormData) {
  const rfqSupplierId = String(formData.get("rfq_supplier_id") ?? "");
  const rfqId = String(formData.get("rfq_id") ?? "");
  const quotedTotal = Number(formData.get("quoted_total") ?? 0);
  const responseNotes = String(formData.get("response_notes") ?? "").trim() || null;

  if (!rfqSupplierId || !quotedTotal || quotedTotal <= 0) {
    return { error: "Enter the quoted total." };
  }

  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase
    .from("edoslmis_rfq_suppliers")
    .update({ quoted_total: quotedTotal, response_notes: responseNotes, responded_at: new Date().toISOString() })
    .eq("id", rfqSupplierId);

  if (error) return { error: error.message };
  revalidatePath(`/rfqs/${rfqId}`);
  return { error: null };
}

export async function closeRfq(rfqId: string) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase
    .from("edoslmis_rfqs")
    .update({ status: "closed" })
    .eq("id", rfqId)
    .in("status", ["draft", "sent"]);

  if (error) return { error: error.message };
  revalidatePath(`/rfqs/${rfqId}`);
  revalidatePath("/rfqs");
  return { error: null };
}

export async function convertRfqToPurchaseOrder(rfqSupplierId: string) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: rfqSupplier, error: rfqSupplierError } = await supabase
    .from("edoslmis_rfq_suppliers")
    .select("id, rfq_id, supplier_id, quoted_total")
    .eq("id", rfqSupplierId)
    .single();
  if (rfqSupplierError) return { error: rfqSupplierError.message };

  const { data: rfq, error: rfqError } = await getRfq(rfqSupplier.rfq_id);
  if (rfqError) return { error: rfqError };
  if (!rfq) return { error: "RFQ not found." };
  if (rfq.lines.length === 0) return { error: "This RFQ has no line items." };

  // Quoted total isn't broken down per line, so unit_cost is left blank on
  // the resulting draft PO — staff fills it in from the supplier's quote
  // before sending, same as any manually-created PO.
  const lines = rfq.lines.map((l) => ({
    item_id: l.item?.id ?? "",
    quantity_ordered: l.quantity_requested,
    unit_cost: null as number | null,
  }));

  const result = await insertDraftPurchaseOrder(
    supabase,
    staff,
    rfqSupplier.supplier_id,
    lines,
    rfq.expected_date,
    `Converted from RFQ ${rfq.rfq_number}${rfqSupplier.quoted_total ? ` — quoted total ${rfqSupplier.quoted_total}` : ""}`
  );
  if ("error" in result) return { error: result.error };

  await supabase.from("edoslmis_rfqs").update({ status: "converted" }).eq("id", rfq.id);

  revalidatePath(`/rfqs/${rfq.id}`);
  redirect(`/purchase-orders/${result.id}/edit`);
}
