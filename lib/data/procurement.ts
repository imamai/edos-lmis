import { createClient } from "@/lib/supabase/server";

export type Supplier = {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  payment_terms: string | null;
  bank_details: string | null;
};

export async function getSuppliers(): Promise<{ data: Supplier[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("edoslmis_suppliers")
    .select("id, name, contact_person, phone, email, address, notes, is_active, payment_terms, bank_details")
    .order("name");
  if (error) return { data: [], error: error.message };
  return { data: data ?? [], error: null };
}

export async function getSupplier(id: string): Promise<Supplier | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("edoslmis_suppliers")
    .select("id, name, contact_person, phone, email, address, notes, is_active, payment_terms, bank_details")
    .eq("id", id)
    .single();
  return data ?? null;
}

export type PurchaseOrderListRow = {
  id: string;
  po_number: string;
  status: string;
  order_date: string;
  expected_date: string | null;
  supplier: { id: string; name: string } | null;
  line_count: number;
};

export async function getPurchaseOrders(): Promise<{ data: PurchaseOrderListRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("edoslmis_purchase_orders")
    .select(
      "id, po_number, status, order_date, expected_date, edoslmis_suppliers(id, name), edoslmis_purchase_order_lines(id)"
    )
    .order("created_at", { ascending: false });
  if (error) return { data: [], error: error.message };

  const rows = (data ?? []).map((po) => ({
    id: po.id,
    po_number: po.po_number,
    status: po.status,
    order_date: po.order_date,
    expected_date: po.expected_date,
    supplier: po.edoslmis_suppliers as unknown as { id: string; name: string } | null,
    line_count: (po.edoslmis_purchase_order_lines as unknown[] | null)?.length ?? 0,
  }));
  return { data: rows, error: null };
}

export type PurchaseOrderLine = {
  id: string;
  quantity_ordered: number;
  unit_cost: number | null;
  quantity_received: number;
  item: { id: string; code: string; name: string; unit_of_measure: string } | null;
};

export type PurchaseOrderDetail = {
  id: string;
  po_number: string;
  status: string;
  order_date: string;
  expected_date: string | null;
  notes: string | null;
  cancelled_reason: string | null;
  revision: number;
  corrected_at: string | null;
  supplier_invoice_number: string | null;
  supplier: Supplier | null;
  lines: PurchaseOrderLine[];
};

export async function getPurchaseOrder(id: string): Promise<{ data: PurchaseOrderDetail | null; error: string | null }> {
  const supabase = await createClient();
  const { data: po, error } = await supabase
    .from("edoslmis_purchase_orders")
    .select(
      "id, po_number, status, order_date, expected_date, notes, cancelled_reason, revision, corrected_at, supplier_invoice_number, edoslmis_suppliers(id, name, contact_person, phone, email, address, notes, is_active, payment_terms, bank_details)"
    )
    .eq("id", id)
    .single();
  if (error) return { data: null, error: error.message };
  if (!po) return { data: null, error: null };

  const { data: lines } = await supabase
    .from("edoslmis_purchase_order_lines")
    .select("id, quantity_ordered, unit_cost, quantity_received, edoslmis_inventory_items(id, code, name, unit_of_measure)")
    .eq("po_id", id);

  return {
    data: {
      id: po.id,
      po_number: po.po_number,
      status: po.status,
      order_date: po.order_date,
      expected_date: po.expected_date,
      notes: po.notes,
      cancelled_reason: po.cancelled_reason,
      revision: po.revision,
      corrected_at: po.corrected_at,
      supplier_invoice_number: po.supplier_invoice_number,
      supplier: po.edoslmis_suppliers as unknown as Supplier | null,
      lines: (lines ?? []).map((l) => ({
        id: l.id,
        quantity_ordered: Number(l.quantity_ordered),
        unit_cost: l.unit_cost === null ? null : Number(l.unit_cost),
        quantity_received: Number(l.quantity_received),
        item: l.edoslmis_inventory_items as unknown as PurchaseOrderLine["item"],
      })),
    },
    error: null,
  };
}

export type ProcurableItem = {
  id: string;
  code: string;
  name: string;
  unit_of_measure: string;
  reorder_level: number;
  current_balance: number;
};

export async function getProcurableItems(): Promise<ProcurableItem[]> {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("edoslmis_inventory_items")
    .select("id, code, name, unit_of_measure, reorder_level")
    .eq("is_active", true)
    .order("name");

  const itemIds = (items ?? []).map((i) => i.id);
  const { data: balances } = itemIds.length
    ? await supabase.from("edoslmis_inventory_balances").select("item_id, current_balance").in("item_id", itemIds)
    : { data: [] as { item_id: string; current_balance: number }[] };
  const balanceByItem = new Map((balances ?? []).map((b) => [b.item_id, Number(b.current_balance)]));

  return (items ?? []).map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    unit_of_measure: item.unit_of_measure,
    reorder_level: Number(item.reorder_level),
    current_balance: balanceByItem.get(item.id) ?? 0,
  }));
}

export type RfqListRow = {
  id: string;
  rfq_number: string;
  status: string;
  expected_date: string | null;
  created_at: string;
  supplier_count: number;
};

export async function getRfqs(): Promise<{ data: RfqListRow[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("edoslmis_rfqs")
    .select("id, rfq_number, status, expected_date, created_at, edoslmis_rfq_suppliers(id)")
    .order("created_at", { ascending: false });
  if (error) return { data: [], error: error.message };

  const rows = (data ?? []).map((rfq) => ({
    id: rfq.id,
    rfq_number: rfq.rfq_number,
    status: rfq.status,
    expected_date: rfq.expected_date,
    created_at: rfq.created_at,
    supplier_count: (rfq.edoslmis_rfq_suppliers as unknown[] | null)?.length ?? 0,
  }));
  return { data: rows, error: null };
}

export type RfqLine = {
  id: string;
  quantity_requested: number;
  item: { id: string; code: string; name: string; unit_of_measure: string } | null;
};

export type RfqSupplierResponse = {
  id: string;
  supplier: { id: string; name: string; email: string | null } | null;
  sent_at: string | null;
  responded_at: string | null;
  quoted_total: number | null;
  response_notes: string | null;
};

export type RfqDetail = {
  id: string;
  rfq_number: string;
  status: string;
  notes: string | null;
  expected_date: string | null;
  created_at: string;
  revision: number;
  corrected_at: string | null;
  lines: RfqLine[];
  suppliers: RfqSupplierResponse[];
};

export async function getRfq(id: string): Promise<{ data: RfqDetail | null; error: string | null }> {
  const supabase = await createClient();
  const { data: rfq, error } = await supabase
    .from("edoslmis_rfqs")
    .select("id, rfq_number, status, notes, expected_date, created_at, revision, corrected_at")
    .eq("id", id)
    .single();
  if (error) return { data: null, error: error.message };
  if (!rfq) return { data: null, error: null };

  const [{ data: lines }, { data: suppliers }] = await Promise.all([
    supabase
      .from("edoslmis_rfq_lines")
      .select("id, quantity_requested, edoslmis_inventory_items(id, code, name, unit_of_measure)")
      .eq("rfq_id", id),
    supabase
      .from("edoslmis_rfq_suppliers")
      .select("id, sent_at, responded_at, quoted_total, response_notes, edoslmis_suppliers(id, name, email)")
      .eq("rfq_id", id),
  ]);

  return {
    data: {
      id: rfq.id,
      rfq_number: rfq.rfq_number,
      status: rfq.status,
      notes: rfq.notes,
      expected_date: rfq.expected_date,
      created_at: rfq.created_at,
      revision: rfq.revision,
      corrected_at: rfq.corrected_at,
      lines: (lines ?? []).map((l) => ({
        id: l.id,
        quantity_requested: Number(l.quantity_requested),
        item: l.edoslmis_inventory_items as unknown as RfqLine["item"],
      })),
      suppliers: (suppliers ?? []).map((s) => ({
        id: s.id,
        supplier: s.edoslmis_suppliers as unknown as RfqSupplierResponse["supplier"],
        sent_at: s.sent_at,
        responded_at: s.responded_at,
        quoted_total: s.quoted_total === null ? null : Number(s.quoted_total),
        response_notes: s.response_notes,
      })),
    },
    error: null,
  };
}
