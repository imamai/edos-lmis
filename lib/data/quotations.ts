import { createClient } from "@/lib/supabase/server";

export type QuotationListRow = {
  id: string;
  quotation_number: string;
  customer_name: string | null;
  status: string;
  quote_date: string;
  valid_until: string | null;
  total_amount: number;
};

export async function getQuotations(): Promise<{ data: QuotationListRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("edoslmis_quotations")
    .select("id, quotation_number, customer_name, status, quote_date, valid_until, total_amount")
    .order("created_at", { ascending: false });
  if (error) return { data: [], error: error.message };

  return {
    data: (data ?? []).map((q) => ({ ...q, total_amount: Number(q.total_amount) })),
    error: null,
  };
}

export type QuotationItem = {
  id: string;
  description: string;
  quantity: number;
  unit_of_measure: string;
  unit_price: number;
  total_amount: number;
};

export type QuotationDetail = {
  id: string;
  quotation_number: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  status: string;
  quote_date: string;
  valid_until: string | null;
  notes: string | null;
  subtotal: number;
  tax_amount: number;
  is_vat_exempt: boolean;
  total_amount: number;
  revision: number;
  corrected_at: string | null;
  items: QuotationItem[];
};

export async function getQuotation(id: string): Promise<{ data: QuotationDetail | null; error: string | null }> {
  const supabase = await createClient();
  const { data: quotation, error } = await supabase
    .from("edoslmis_quotations")
    .select(
      "id, quotation_number, customer_name, customer_email, customer_phone, status, quote_date, valid_until, notes, subtotal, tax_amount, is_vat_exempt, total_amount, revision, corrected_at"
    )
    .eq("id", id)
    .single();
  if (error) return { data: null, error: error.message };
  if (!quotation) return { data: null, error: null };

  const { data: items } = await supabase
    .from("edoslmis_quotation_items")
    .select("id, description, quantity, unit_of_measure, unit_price, total_amount")
    .eq("quotation_id", id)
    .order("sort_order");

  return {
    data: {
      id: quotation.id,
      quotation_number: quotation.quotation_number,
      customer_name: quotation.customer_name,
      customer_email: quotation.customer_email,
      customer_phone: quotation.customer_phone,
      status: quotation.status,
      quote_date: quotation.quote_date,
      valid_until: quotation.valid_until,
      notes: quotation.notes,
      subtotal: Number(quotation.subtotal),
      tax_amount: Number(quotation.tax_amount),
      is_vat_exempt: quotation.is_vat_exempt,
      total_amount: Number(quotation.total_amount),
      revision: quotation.revision,
      corrected_at: quotation.corrected_at,
      items: (items ?? []).map((i) => ({
        id: i.id,
        description: i.description,
        quantity: Number(i.quantity),
        unit_of_measure: i.unit_of_measure,
        unit_price: Number(i.unit_price),
        total_amount: Number(i.total_amount),
      })),
    },
    error: null,
  };
}
