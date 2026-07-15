-- EDOS LMIS Phase 15 — Accounts payable (supplier bills + payments)
-- Mirrors the patient-billing (AR) pattern in 0014_edoslmis_billing.sql —
-- same generated balance_due column, same atomic generate/record-payment RPC
-- shape, same RLS pattern — but for money owed TO suppliers instead of
-- money owed BY patients. Reuses 'edoslmis.billing.manage' (same permission
-- as invoices/payments/quotations) since this is a financial document, not
-- an inventory one, per the precedent quotations already set.
--
-- edoslmis_purchase_orders has no stored total (money only lives on line
-- rows, unit_cost is nullable) — a bill's subtotal/total is computed by
-- summing received PO lines at generation time, same as
-- edoslmis_generate_invoice_for_order sums edoslmis_order_tests.price.
--
-- payment_method is varchar(30) fed by the existing tenant-configurable
-- 'payment_method' settings list (edoslmis_settings_lists, same one used by
-- edoslmis_payments since migration 0036) rather than a new enum.

do $$ begin
  create type edoslmis_supplier_bill_status as enum (
    'issued','partially_paid','paid','cancelled'
  );
exception when duplicate_object then null; end $$;

create sequence if not exists edoslmis_supplier_bill_number_seq;
create or replace function edoslmis_generate_supplier_bill_number()
returns text
language sql
as $$
  select 'BILL-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('edoslmis_supplier_bill_number_seq')::text, 6, '0');
$$;

-- ---------------------------------------------------------------------------
-- Supplier bills
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_supplier_bills (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  branch_id uuid references edoshms_branches(id),
  bill_number varchar(40) not null,
  supplier_id uuid not null references edoslmis_suppliers(id),
  po_id uuid not null references edoslmis_purchase_orders(id),
  subtotal numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0,
  balance_due numeric(14,2) generated always as (total_amount - amount_paid) stored,
  status edoslmis_supplier_bill_status not null default 'issued',
  bill_date date not null default current_date,
  due_date date,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, bill_number),
  unique (po_id)
);
create index if not exists edoslmis_supplier_bills_tenant_idx on edoslmis_supplier_bills(tenant_id);
create index if not exists edoslmis_supplier_bills_supplier_idx on edoslmis_supplier_bills(supplier_id);
create index if not exists edoslmis_supplier_bills_status_idx on edoslmis_supplier_bills(status);
drop trigger if exists edoslmis_trg_supplier_bills_updated_at on edoslmis_supplier_bills;
create trigger edoslmis_trg_supplier_bills_updated_at
  before update on edoslmis_supplier_bills
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Supplier bill line items
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_supplier_bill_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  bill_id uuid not null references edoslmis_supplier_bills(id) on delete cascade,
  po_line_id uuid references edoslmis_purchase_order_lines(id),
  description varchar(250) not null,
  quantity numeric(14,4) not null default 1,
  unit_cost numeric(12,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists edoslmis_supplier_bill_items_tenant_idx on edoslmis_supplier_bill_items(tenant_id);
create index if not exists edoslmis_supplier_bill_items_bill_idx on edoslmis_supplier_bill_items(bill_id);

-- ---------------------------------------------------------------------------
-- Supplier payments
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_supplier_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  bill_id uuid not null references edoslmis_supplier_bills(id),
  amount numeric(14,2) not null,
  payment_method varchar(30) not null,
  reference_number varchar(100),
  notes text,
  received_by uuid references edoshms_user_profiles(id),
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists edoslmis_supplier_payments_tenant_idx on edoslmis_supplier_payments(tenant_id);
create index if not exists edoslmis_supplier_payments_bill_idx on edoslmis_supplier_payments(bill_id, paid_at);

-- ---------------------------------------------------------------------------
-- Generate a supplier bill from a received PO (atomic, locks the PO).
-- ---------------------------------------------------------------------------
create or replace function edoslmis_generate_supplier_bill_from_po(p_po_id uuid)
returns edoslmis_supplier_bills
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tenant_id uuid;
  v_branch_id uuid;
  v_supplier_id uuid;
  v_status edoslmis_po_status;
  v_subtotal numeric(14,2);
  v_bill_number text;
  v_bill edoslmis_supplier_bills;
begin
  select tenant_id, branch_id, supplier_id, status
    into v_tenant_id, v_branch_id, v_supplier_id, v_status
  from edoslmis_purchase_orders
  where id = p_po_id
  for update;

  if not found then
    raise exception 'Purchase order % not found', p_po_id;
  end if;

  if v_tenant_id <> edoshms_get_tenant_id() and not edoshms_is_platform_admin() then
    raise exception 'Not authorized for this tenant';
  end if;

  if not (edoslmis_has_permission('edoslmis.billing.manage') or edoslmis_is_admin_for(v_tenant_id)) then
    raise exception 'Not authorized to generate supplier bills';
  end if;

  if v_status not in ('partially_received', 'received') then
    raise exception 'Cannot bill a purchase order that has not received any commodities';
  end if;

  if exists (select 1 from edoslmis_supplier_bills where po_id = p_po_id) then
    raise exception 'A supplier bill already exists for this purchase order';
  end if;

  select coalesce(sum(quantity_received * coalesce(unit_cost, 0)), 0) into v_subtotal
  from edoslmis_purchase_order_lines
  where po_id = p_po_id and quantity_received > 0;

  v_bill_number := edoslmis_generate_supplier_bill_number();

  insert into edoslmis_supplier_bills (
    tenant_id, branch_id, bill_number, supplier_id, po_id, subtotal, total_amount, status, created_by
  ) values (
    v_tenant_id, v_branch_id, v_bill_number, v_supplier_id, p_po_id, v_subtotal, v_subtotal, 'issued', auth.uid()
  )
  returning * into v_bill;

  insert into edoslmis_supplier_bill_items (tenant_id, bill_id, po_line_id, description, quantity, unit_cost, total_amount)
  select v_tenant_id, v_bill.id, l.id, i.name, l.quantity_received, coalesce(l.unit_cost, 0), l.quantity_received * coalesce(l.unit_cost, 0)
  from edoslmis_purchase_order_lines l
  join edoslmis_inventory_items i on i.id = l.item_id
  where l.po_id = p_po_id and l.quantity_received > 0;

  return v_bill;
end;
$$;

grant execute on function edoslmis_generate_supplier_bill_from_po(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Record a payment against a supplier bill (atomic, locks the bill).
-- ---------------------------------------------------------------------------
create or replace function edoslmis_record_supplier_payment(
  p_bill_id uuid,
  p_amount numeric,
  p_payment_method varchar,
  p_reference_number text default null,
  p_notes text default null
)
returns edoslmis_supplier_payments
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tenant_id uuid;
  v_total_amount numeric(14,2);
  v_amount_paid numeric(14,2);
  v_new_paid numeric(14,2);
  v_row edoslmis_supplier_payments;
begin
  select tenant_id, total_amount, amount_paid
    into v_tenant_id, v_total_amount, v_amount_paid
  from edoslmis_supplier_bills
  where id = p_bill_id
  for update;

  if not found then
    raise exception 'Supplier bill % not found', p_bill_id;
  end if;

  if v_tenant_id <> edoshms_get_tenant_id() and not edoshms_is_platform_admin() then
    raise exception 'Not authorized for this tenant';
  end if;

  if not (edoslmis_has_permission('edoslmis.billing.manage') or edoslmis_is_admin_for(v_tenant_id)) then
    raise exception 'Not authorized to record supplier payments';
  end if;

  if p_amount <= 0 then
    raise exception 'Payment amount must be positive';
  end if;

  v_new_paid := v_amount_paid + p_amount;

  insert into edoslmis_supplier_payments (
    tenant_id, bill_id, amount, payment_method, reference_number, notes, received_by
  ) values (
    v_tenant_id, p_bill_id, p_amount, p_payment_method, p_reference_number, p_notes, auth.uid()
  )
  returning * into v_row;

  update edoslmis_supplier_bills
  set amount_paid = v_new_paid,
      status = case
        when v_new_paid >= v_total_amount then 'paid'
        when v_new_paid > 0 then 'partially_paid'
        else status
      end
  where id = p_bill_id;

  return v_row;
end;
$$;

grant execute on function edoslmis_record_supplier_payment(uuid, numeric, varchar, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table edoslmis_supplier_bills enable row level security;
drop policy if exists edoslmis_supplier_bills_select on edoslmis_supplier_bills;
create policy edoslmis_supplier_bills_select on edoslmis_supplier_bills
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
drop policy if exists edoslmis_supplier_bills_write on edoslmis_supplier_bills;
create policy edoslmis_supplier_bills_write on edoslmis_supplier_bills
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.billing.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.billing.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_supplier_bill_items enable row level security;
drop policy if exists edoslmis_supplier_bill_items_select on edoslmis_supplier_bill_items;
create policy edoslmis_supplier_bill_items_select on edoslmis_supplier_bill_items
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
drop policy if exists edoslmis_supplier_bill_items_insert on edoslmis_supplier_bill_items;
create policy edoslmis_supplier_bill_items_insert on edoslmis_supplier_bill_items
  for insert with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.billing.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_supplier_payments enable row level security;
drop policy if exists edoslmis_supplier_payments_select on edoslmis_supplier_payments;
create policy edoslmis_supplier_payments_select on edoslmis_supplier_payments
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
drop policy if exists edoslmis_supplier_payments_insert on edoslmis_supplier_payments;
create policy edoslmis_supplier_payments_insert on edoslmis_supplier_payments
  for insert with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.billing.manage') or edoslmis_is_admin_for(tenant_id))
  );
