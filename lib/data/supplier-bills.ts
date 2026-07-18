import { createClient } from "@/lib/supabase/server";

export type SupplierBillListRow = {
  id: string;
  bill_number: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  bill_date: string;
  supplier: { id: string; name: string } | null;
};

export async function getSupplierBills(): Promise<{ data: SupplierBillListRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("edoslmis_supplier_bills")
    .select("id, bill_number, total_amount, amount_paid, balance_due, status, bill_date, edoslmis_suppliers(id, name)")
    .order("created_at", { ascending: false });
  if (error) return { data: [], error: error.message };

  const rows = (data ?? []).map((b) => ({
    id: b.id,
    bill_number: b.bill_number,
    total_amount: Number(b.total_amount),
    amount_paid: Number(b.amount_paid),
    balance_due: Number(b.balance_due),
    status: b.status,
    bill_date: b.bill_date,
    supplier: b.edoslmis_suppliers as unknown as { id: string; name: string } | null,
  }));
  return { data: rows, error: null };
}

export type SupplierBillItem = {
  id: string;
  description: string;
  quantity: number;
  unit_cost: number;
  total_amount: number;
};

export type SupplierBillPayment = {
  id: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  paid_at: string;
};

export type SupplierBillDetail = {
  id: string;
  bill_number: string;
  po_id: string;
  subtotal: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  bill_date: string;
  notes: string | null;
  cancellation_reason: string | null;
  supplier_invoice_number: string | null;
  supplier: { id: string; name: string; email: string | null; phone: string | null } | null;
  items: SupplierBillItem[];
  payments: SupplierBillPayment[];
};

export async function getSupplierBill(id: string): Promise<{ data: SupplierBillDetail | null; error: string | null }> {
  const supabase = await createClient();
  const { data: bill, error } = await supabase
    .from("edoslmis_supplier_bills")
    .select(
      "id, bill_number, po_id, subtotal, total_amount, amount_paid, balance_due, status, bill_date, notes, cancellation_reason, supplier_invoice_number, edoslmis_suppliers(id, name, email, phone)"
    )
    .eq("id", id)
    .single();
  if (error) return { data: null, error: error.message };
  if (!bill) return { data: null, error: null };

  const [{ data: items }, { data: payments }] = await Promise.all([
    supabase
      .from("edoslmis_supplier_bill_items")
      .select("id, description, quantity, unit_cost, total_amount")
      .eq("bill_id", id),
    supabase
      .from("edoslmis_supplier_payments")
      .select("id, amount, payment_method, reference_number, paid_at")
      .eq("bill_id", id)
      .order("paid_at", { ascending: false }),
  ]);

  return {
    data: {
      id: bill.id,
      bill_number: bill.bill_number,
      po_id: bill.po_id,
      subtotal: Number(bill.subtotal),
      total_amount: Number(bill.total_amount),
      amount_paid: Number(bill.amount_paid),
      balance_due: Number(bill.balance_due),
      status: bill.status,
      bill_date: bill.bill_date,
      notes: bill.notes,
      cancellation_reason: bill.cancellation_reason,
      supplier_invoice_number: bill.supplier_invoice_number,
      supplier: bill.edoslmis_suppliers as unknown as SupplierBillDetail["supplier"],
      items: (items ?? []).map((i) => ({
        id: i.id,
        description: i.description,
        quantity: Number(i.quantity),
        unit_cost: Number(i.unit_cost),
        total_amount: Number(i.total_amount),
      })),
      payments: (payments ?? []).map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        payment_method: p.payment_method,
        reference_number: p.reference_number,
        paid_at: p.paid_at,
      })),
    },
    error: null,
  };
}

export type OutstandingSupplierBill = {
  id: string;
  bill_number: string;
  bill_date: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  status: string;
};

/**
 * Unpaid/partially-paid bills for a single supplier — the list the bulk
 * payment picker checks off. Never includes cancelled or fully-paid bills.
 */
export async function getOutstandingSupplierBills(supplierId: string): Promise<OutstandingSupplierBill[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("edoslmis_supplier_bills")
    .select("id, bill_number, bill_date, total_amount, amount_paid, balance_due, status")
    .eq("supplier_id", supplierId)
    .in("status", ["issued", "partially_paid"])
    .gt("balance_due", 0)
    .order("bill_date", { ascending: true });
  if (error) {
    console.error("getOutstandingSupplierBills: query failed", error);
    return [];
  }
  return (data ?? []).map((b) => ({
    id: b.id,
    bill_number: b.bill_number,
    bill_date: b.bill_date,
    total_amount: Number(b.total_amount),
    amount_paid: Number(b.amount_paid),
    balance_due: Number(b.balance_due),
    status: b.status,
  }));
}

export async function getSupplierBillByPoId(poId: string): Promise<{ id: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("edoslmis_supplier_bills")
    .select("id")
    .eq("po_id", poId)
    .neq("status", "cancelled")
    .maybeSingle();
  return data ?? null;
}
