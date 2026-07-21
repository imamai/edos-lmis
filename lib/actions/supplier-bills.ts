"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function generateSupplierBill(poId: string) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { data: bill, error } = await supabase
    .rpc("edoslmis_generate_supplier_bill_from_po", { p_po_id: poId })
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/purchase-orders/${poId}`);
  revalidatePath("/supplier-bills");
  redirect(`/supplier-bills/${(bill as { id: string }).id}`);
}

export async function recordSupplierPayment(
  _prevState: { error: string | null } | null,
  formData: FormData
) {
  const billId = String(formData.get("bill_id") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const paymentMethod = String(formData.get("payment_method") ?? "");
  const referenceNumber = String(formData.get("reference_number") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!billId || !paymentMethod || amount <= 0) {
    return { error: "Enter a valid payment method and amount." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("edoslmis_record_supplier_payment", {
    p_bill_id: billId,
    p_amount: amount,
    p_payment_method: paymentMethod,
    p_reference_number: referenceNumber,
    p_notes: notes,
  });

  if (error) return { error: error.message };

  revalidatePath(`/supplier-bills/${billId}`);
  revalidatePath("/supplier-bills");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function recordBulkSupplierPayments(
  _prevState: { error: string | null } | null,
  formData: FormData
) {
  const billIds = formData.getAll("bill_id").map(String).filter(Boolean);
  const paymentMethod = String(formData.get("payment_method") ?? "");
  const referenceNumber = String(formData.get("reference_number") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (billIds.length === 0) return { error: "Select at least one bill." };
  if (!paymentMethod) return { error: "Choose a payment method." };

  const amounts: number[] = [];
  for (const billId of billIds) {
    const amount = Number(formData.get(`amount__${billId}`) ?? 0);
    if (!amount || amount <= 0) return { error: "Enter a positive amount for every selected bill." };
    amounts.push(amount);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("edoslmis_record_bulk_supplier_payments", {
    p_bill_ids: billIds,
    p_amounts: amounts,
    p_payment_method: paymentMethod,
    p_reference_number: referenceNumber,
    p_notes: notes,
  });

  if (error) return { error: error.message };

  revalidatePath("/supplier-bills");
  revalidatePath("/supplier-bills/pay");
  revalidatePath("/dashboard");
  for (const billId of billIds) revalidatePath(`/supplier-bills/${billId}`);
  return { error: null };
}

export async function updateSupplierBillSupplierInvoiceNumber(
  _prevState: { error: string | null } | null,
  formData: FormData
) {
  await getCurrentStaff();
  const supabase = await createClient();

  const billId = String(formData.get("bill_id") ?? "");
  if (!billId) return { error: "Missing supplier bill." };
  const supplierInvoiceNumber = String(formData.get("supplier_invoice_number") ?? "").trim() || null;

  const { data: current, error: currentError } = await supabase
    .from("edoslmis_supplier_bills")
    .select("id, po_id")
    .eq("id", billId)
    .neq("status", "cancelled")
    .single();
  if (currentError) return { error: "This supplier bill is cancelled and can no longer be edited." };

  const { error } = await supabase
    .from("edoslmis_supplier_bills")
    .update({ supplier_invoice_number: supplierInvoiceNumber })
    .eq("id", billId);
  if (error) return { error: error.message };

  // Keep the PO's own copy in sync too — same mirrored sync
  // correctPurchaseOrder does in the other direction, so the number matches
  // everywhere it's tracked regardless of which side it was corrected from.
  await supabase
    .from("edoslmis_purchase_orders")
    .update({ supplier_invoice_number: supplierInvoiceNumber })
    .eq("id", current.po_id)
    .neq("status", "cancelled");

  revalidatePath(`/supplier-bills/${billId}`);
  revalidatePath(`/purchase-orders/${current.po_id}`);
  return { error: null };
}

export async function updateSupplierBill(_prevState: { error: string | null } | null, formData: FormData) {
  await getCurrentStaff();
  const supabase = await createClient();

  const billId = String(formData.get("bill_id") ?? "");
  if (!billId) return { error: "Missing supplier bill." };
  const billDate = String(formData.get("bill_date") ?? "").trim();
  if (!billDate) return { error: "Enter a bill date." };
  const dueDate = String(formData.get("due_date") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const { error: currentError } = await supabase
    .from("edoslmis_supplier_bills")
    .select("id")
    .eq("id", billId)
    .neq("status", "cancelled")
    .single();
  if (currentError) return { error: "This supplier bill is cancelled and can no longer be edited." };

  const { error } = await supabase
    .from("edoslmis_supplier_bills")
    .update({ bill_date: billDate, due_date: dueDate, notes })
    .eq("id", billId);
  if (error) return { error: error.message };

  revalidatePath(`/supplier-bills/${billId}`);
  return { error: null };
}

export async function deleteSupplierBill(billId: string) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { data: bill, error: fetchError } = await supabase
    .from("edoslmis_supplier_bills")
    .select("po_id, status")
    .eq("id", billId)
    .single();
  if (fetchError) return { error: fetchError.message };
  if (bill.status !== "cancelled") return { error: "Only cancelled bills can be deleted." };

  const { error } = await supabase.from("edoslmis_supplier_bills").delete().eq("id", billId);
  if (error) return { error: error.message };

  revalidatePath("/supplier-bills");
  revalidatePath(`/purchase-orders/${bill.po_id}`);
  redirect("/supplier-bills");
}

export async function cancelSupplierBill(_prevState: { error: string | null } | null, formData: FormData) {
  const billId = String(formData.get("bill_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!billId || !reason) return { error: "Enter a cancellation reason." };

  await getCurrentStaff();
  const supabase = await createClient();

  const { data: bill } = await supabase
    .from("edoslmis_supplier_bills")
    .select("amount_paid, po_id")
    .eq("id", billId)
    .single();
  if (!bill) return { error: "Supplier bill not found." };
  if (Number(bill.amount_paid) > 0) {
    return { error: "This bill has payments recorded and can't be cancelled." };
  }

  const { error } = await supabase
    .from("edoslmis_supplier_bills")
    .update({ status: "cancelled", cancellation_reason: reason })
    .eq("id", billId);
  if (error) return { error: error.message };

  revalidatePath(`/supplier-bills/${billId}`);
  revalidatePath("/supplier-bills");
  revalidatePath(`/purchase-orders/${bill.po_id}`);
  return { error: null };
}
