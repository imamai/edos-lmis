"use server";

import { createElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { getTenantSettings } from "@/lib/data/settings";
import { getQuotation } from "@/lib/data/quotations";
import { sendNotification } from "@/lib/notifications";
import { renderPdf } from "@/lib/pdf/render";
import { QuotationDocument } from "@/lib/pdf/quotation-document";
import { computeVatAmount, computeLineTotal } from "@/lib/money";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

type QuotationLine = {
  description: string;
  quantity: number;
  unit_of_measure: string;
  unit_price: number;
  total_amount: number;
};

function parseLines(formData: FormData): QuotationLine[] {
  const descriptions = formData.getAll("item_description").map(String);
  const quantities = formData.getAll("item_quantity").map(String);
  const units = formData.getAll("item_unit").map(String);
  const unitPrices = formData.getAll("item_unit_price").map(String);

  const lines: QuotationLine[] = [];
  for (let i = 0; i < descriptions.length; i++) {
    const description = descriptions[i].trim();
    const quantity = Number(quantities[i] ?? 0);
    const unitPrice = Number(unitPrices[i] ?? 0);
    if (!description || !quantity || quantity <= 0) continue;
    lines.push({
      description,
      quantity,
      unit_of_measure: units[i]?.trim() || "piece",
      unit_price: unitPrice,
      total_amount: computeLineTotal(quantity, unitPrice),
    });
  }
  return lines;
}

async function computeVat(tenantId: string, subtotal: number, isVatExempt: boolean) {
  const { vat_rate, vat_enabled } = await getTenantSettings(tenantId);
  if (isVatExempt || !vat_enabled) return 0;
  return computeVatAmount(subtotal, vat_rate);
}

export async function createQuotation(_prevState: { error: string } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const lines = parseLines(formData);
  if (lines.length === 0) return { error: "Add at least one line item with a description and quantity." };

  const customerName = String(formData.get("customer_name") ?? "").trim() || null;
  const customerEmail = String(formData.get("customer_email") ?? "").trim() || null;
  const customerPhone = String(formData.get("customer_phone") ?? "").trim() || null;
  const validUntil = String(formData.get("valid_until") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const isVatExempt = formData.get("is_vat_exempt") === "on";
  const subtotal = lines.reduce((sum, l) => sum + l.total_amount, 0);
  const taxAmount = await computeVat(staff.tenantId, subtotal, isVatExempt);

  const { data: quotationNumber, error: numberError } = await supabase.rpc("edoslmis_generate_quotation_number");
  if (numberError) return { error: numberError.message };

  const { data: quotation, error: quotationError } = await supabase
    .from("edoslmis_quotations")
    .insert({
      tenant_id: staff.tenantId,
      branch_id: staff.branchId,
      quotation_number: quotationNumber as string,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      valid_until: validUntil,
      notes,
      subtotal,
      tax_amount: taxAmount,
      is_vat_exempt: isVatExempt,
      total_amount: subtotal + taxAmount,
      created_by: staff.userId,
    })
    .select("id")
    .single();

  if (quotationError) return { error: quotationError.message };

  const { error: itemsError } = await supabase.from("edoslmis_quotation_items").insert(
    lines.map((l, i) => ({
      tenant_id: staff.tenantId,
      quotation_id: quotation.id,
      description: l.description,
      quantity: l.quantity,
      unit_of_measure: l.unit_of_measure,
      unit_price: l.unit_price,
      total_amount: l.total_amount,
      sort_order: i,
    }))
  );
  if (itemsError) return { error: itemsError.message };

  redirect(`/quotations/${quotation.id}`);
}

export async function updateQuotation(_prevState: { error: string } | null, formData: FormData) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const quotationId = String(formData.get("quotation_id") ?? "");
  if (!quotationId) return { error: "Missing quotation." };

  const lines = parseLines(formData);
  if (lines.length === 0) return { error: "Add at least one line item with a description and quantity." };

  const customerName = String(formData.get("customer_name") ?? "").trim() || null;
  const customerEmail = String(formData.get("customer_email") ?? "").trim() || null;
  const customerPhone = String(formData.get("customer_phone") ?? "").trim() || null;
  const validUntil = String(formData.get("valid_until") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const isVatExempt = formData.get("is_vat_exempt") === "on";
  const subtotal = lines.reduce((sum, l) => sum + l.total_amount, 0);
  const taxAmount = await computeVat(staff.tenantId, subtotal, isVatExempt);

  // Editable while draft/sent — not once accepted/rejected/expired.
  // Correcting an already-sent quotation bumps `revision` so staff know to
  // resend it to the customer; replacing the full line set (delete +
  // reinsert) is safe since nothing downstream references quotation items.
  const { data: current, error: currentError } = await supabase
    .from("edoslmis_quotations")
    .select("status, revision")
    .eq("id", quotationId)
    .in("status", ["draft", "sent"])
    .single();
  if (currentError) return { error: "This quotation can no longer be edited." };

  const { error: quotationError } = await supabase
    .from("edoslmis_quotations")
    .update({
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      valid_until: validUntil,
      notes,
      subtotal,
      tax_amount: taxAmount,
      is_vat_exempt: isVatExempt,
      total_amount: subtotal + taxAmount,
      ...(current.status !== "draft"
        ? { revision: current.revision + 1, corrected_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", quotationId);
  if (quotationError) return { error: quotationError.message };

  const { error: deleteError } = await supabase.from("edoslmis_quotation_items").delete().eq("quotation_id", quotationId);
  if (deleteError) return { error: deleteError.message };

  const { error: itemsError } = await supabase.from("edoslmis_quotation_items").insert(
    lines.map((l, i) => ({
      tenant_id: staff.tenantId,
      quotation_id: quotationId,
      description: l.description,
      quantity: l.quantity,
      unit_of_measure: l.unit_of_measure,
      unit_price: l.unit_price,
      total_amount: l.total_amount,
      sort_order: i,
    }))
  );
  if (itemsError) return { error: itemsError.message };

  redirect(`/quotations/${quotationId}`);
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent"],
  sent: ["accepted", "rejected", "expired"],
};

export async function updateQuotationStatus(quotationId: string, status: string) {
  await getCurrentStaff();
  const supabase = await createClient();

  const { data: current } = await supabase
    .from("edoslmis_quotations")
    .select("status")
    .eq("id", quotationId)
    .single();

  if (!current || !ALLOWED_TRANSITIONS[current.status]?.includes(status)) {
    return { error: `Cannot move a ${current?.status ?? "unknown"} quotation to ${status}.` };
  }

  const { error } = await supabase.from("edoslmis_quotations").update({ status }).eq("id", quotationId);
  if (error) return { error: error.message };

  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath("/quotations");
  return { error: null };
}

export async function sendQuotation(quotationId: string) {
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: quotation, error: quotationError } = await getQuotation(quotationId);
  if (quotationError) return { error: quotationError };
  if (!quotation) return { error: "Quotation not found." };

  let emailed = false;
  let emailError: string | null = null;
  if (quotation.customer_email) {
    const settings = await getTenantSettings(staff.tenantId);
    const pdf = await renderPdf(createElement(QuotationDocument, { quotation, settings }));
    const result = await sendNotification(
      staff.tenantId,
      {
        channel: "email",
        recipient: quotation.customer_email,
        subject: `Quotation ${quotation.quotation_number}`,
        message: `Please find attached Quotation ${quotation.quotation_number}${quotation.valid_until ? ` (valid until ${quotation.valid_until})` : ""}.`,
        attachment: { filename: `${quotation.quotation_number}.pdf`, content: pdf, contentType: "application/pdf" },
        replyTo: settings.clinic_email ?? undefined,
        fromName: settings.clinic_name ?? undefined,
      },
      { table: "edoslmis_quotations", id: quotationId }
    );
    emailed = result.ok;
    if (!result.ok) emailError = result.error ?? "Failed to send email.";
  }

  const { error } = await supabase
    .from("edoslmis_quotations")
    .update({ status: "sent" })
    .eq("id", quotationId)
    .eq("status", "draft");
  if (error) return { error: error.message };

  revalidatePath(`/quotations/${quotationId}`);
  revalidatePath("/quotations");
  return { error: null, emailed, emailError, customerEmail: quotation.customer_email };
}

export async function resendQuotation(quotationId: string) {
  const staff = await getCurrentStaff();

  const { data: quotation, error: quotationError } = await getQuotation(quotationId);
  if (quotationError) return { error: quotationError };
  if (!quotation) return { error: "Quotation not found." };
  if (quotation.revision === 0) return { error: "This quotation has no corrections to resend." };
  if (!quotation.customer_email) return { error: "No customer email on file — send the PDF manually." };

  const settings = await getTenantSettings(staff.tenantId);
  const pdf = await renderPdf(createElement(QuotationDocument, { quotation, settings }));
  const result = await sendNotification(
    staff.tenantId,
    {
      channel: "email",
      recipient: quotation.customer_email,
      subject: `Revised Quotation ${quotation.quotation_number} — Rev. ${quotation.revision}`,
      message: `Please find attached a revised version (Rev. ${quotation.revision}) of Quotation ${quotation.quotation_number}, superseding the version sent earlier.`,
      attachment: { filename: `${quotation.quotation_number}-rev${quotation.revision}.pdf`, content: pdf, contentType: "application/pdf" },
      replyTo: settings.clinic_email ?? undefined,
      fromName: settings.clinic_name ?? undefined,
    },
    { table: "edoslmis_quotations", id: quotationId }
  );

  if (!result.ok) return { error: result.error ?? "Failed to send email." };
  return { error: null, emailed: true, customerEmail: quotation.customer_email };
}
