import { NextResponse } from "next/server";
import { createElement } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentStaff } from "@/lib/auth";
import { getTenantSettings } from "@/lib/data/settings";
import { renderPdf, pdfContentDisposition } from "@/lib/pdf/render";
import { InvoiceDocument, type InvoicePdfData } from "@/lib/pdf/invoice-document";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const staff = await getCurrentStaff();
  const supabase = await createClient();

  const { data: invoice, error: invoiceError } = await supabase
    .from("edoslmis_invoices")
    .select(
      "invoice_number, subtotal, tax_amount, is_vat_exempt, total_amount, amount_paid, balance_due, status, payer_type, issued_at, edoslmis_patients(first_name, last_name, patient_number)"
    )
    .eq("id", id)
    .single();

  if (invoiceError) {
    return NextResponse.json({ error: invoiceError.message }, { status: 500 });
  }
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const [{ data: items }, { data: payments }, settings] = await Promise.all([
    supabase.from("edoslmis_invoice_items").select("description, quantity, unit_price, total_amount").eq("invoice_id", id),
    supabase
      .from("edoslmis_payments")
      .select("amount, payment_method, reference_number, paid_at")
      .eq("invoice_id", id)
      .order("paid_at", { ascending: false }),
    getTenantSettings(staff.tenantId),
  ]);

  const data: InvoicePdfData = {
    invoice_number: invoice.invoice_number,
    status: invoice.status,
    payer_type: invoice.payer_type,
    subtotal: Number(invoice.subtotal),
    tax_amount: Number(invoice.tax_amount),
    is_vat_exempt: invoice.is_vat_exempt,
    total_amount: Number(invoice.total_amount),
    amount_paid: Number(invoice.amount_paid),
    balance_due: Number(invoice.balance_due),
    issued_at: invoice.issued_at,
    patient: invoice.edoslmis_patients as unknown as InvoicePdfData["patient"],
    items: (items ?? []).map((i) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      total_amount: Number(i.total_amount),
    })),
    payments: (payments ?? []).map((p) => ({
      amount: Number(p.amount),
      payment_method: p.payment_method,
      reference_number: p.reference_number,
      paid_at: p.paid_at,
    })),
  };

  const buffer = await renderPdf(createElement(InvoiceDocument, { invoice: data, settings }));

  return new NextResponse(buffer as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": pdfContentDisposition(request, `${data.invoice_number}.pdf`),
    },
  });
}
