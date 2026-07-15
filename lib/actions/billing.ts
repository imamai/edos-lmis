"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function generateInvoice(orderId: string, isVatExempt: boolean) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { data: invoice, error } = await supabase
    .rpc("edoslmis_generate_invoice_for_order", { p_order_id: orderId, p_is_vat_exempt: isVatExempt })
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/billing");
  redirect(`/billing/${(invoice as { id: string }).id}`);
}

export async function recordPayment(
  _prevState: { error: string | null } | null,
  formData: FormData
) {
  const invoiceId = String(formData.get("invoice_id") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const paymentMethod = String(formData.get("payment_method") ?? "");
  const referenceNumber = String(formData.get("reference_number") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!invoiceId || !paymentMethod || amount <= 0) {
    return { error: "Enter a valid payment method and amount." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("edoslmis_record_payment", {
    p_invoice_id: invoiceId,
    p_amount: amount,
    p_payment_method: paymentMethod,
    p_reference_number: referenceNumber,
    p_notes: notes,
  });

  if (error) return { error: error.message };

  revalidatePath(`/billing/${invoiceId}`);
  revalidatePath("/billing");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function submitClaim(
  _prevState: { error: string | null } | null,
  formData: FormData
) {
  const invoiceId = String(formData.get("invoice_id") ?? "");
  const schemeName = String(formData.get("scheme_name") ?? "").trim();
  const policyNumber = String(formData.get("policy_number") ?? "").trim() || null;
  const claimNumber = String(formData.get("claim_number") ?? "").trim() || null;

  if (!invoiceId || !schemeName) return { error: "Enter the insurance scheme name." };

  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { error } = await supabase.from("edoslmis_insurance_claims").insert({
    tenant_id: staff.tenantId,
    invoice_id: invoiceId,
    scheme_name: schemeName,
    policy_number: policyNumber,
    claim_number: claimNumber,
    status: "submitted",
    submitted_at: new Date().toISOString(),
    created_by: staff.userId,
  });

  if (error) return { error: error.message };

  revalidatePath(`/billing/${invoiceId}`);
  return { error: null };
}

export async function updateClaimStatus(
  _prevState: { error: string | null } | null,
  formData: FormData
) {
  const claimId = String(formData.get("claim_id") ?? "");
  const invoiceId = String(formData.get("invoice_id") ?? "");
  const status = String(formData.get("status") ?? "");
  const approvedAmount = formData.get("approved_amount")
    ? Number(formData.get("approved_amount"))
    : null;
  const rejectionReason = String(formData.get("rejection_reason") ?? "").trim() || null;

  if (!claimId || !status) return { error: "Select a claim status." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("edoslmis_insurance_claims")
    .update({ status, approved_amount: approvedAmount, rejection_reason: rejectionReason })
    .eq("id", claimId);

  if (error) return { error: error.message };

  revalidatePath(`/billing/${invoiceId}`);
  return { error: null };
}

export async function cancelInvoice(_prevState: { error: string | null } | null, formData: FormData) {
  const invoiceId = String(formData.get("invoice_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!invoiceId || !reason) return { error: "Enter a cancellation reason." };

  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("edoslmis_invoices")
    .select("amount_paid, order_id")
    .eq("id", invoiceId)
    .single();
  if (!invoice) return { error: "Invoice not found." };
  if (Number(invoice.amount_paid) > 0) {
    return { error: "This invoice has payments recorded and can't be cancelled." };
  }

  const { error } = await supabase
    .from("edoslmis_invoices")
    .update({ status: "cancelled", cancellation_reason: reason })
    .eq("id", invoiceId);
  if (error) return { error: error.message };

  revalidatePath(`/billing/${invoiceId}`);
  revalidatePath("/billing");
  if (invoice.order_id) revalidatePath(`/orders/${invoice.order_id}`);
  return { error: null };
}
