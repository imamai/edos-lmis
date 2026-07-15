-- EDOS LMIS Phase 7 — commodity procurement (suppliers + purchase orders)
-- Additive only: no existing table, function, or policy is modified.
-- Reuses the existing 'edoslmis.inventory.manage' permission (same permission
-- that already gates stock receipts/adjustments/daily checks) rather than
-- introducing a new permission string, and reuses edoslmis_record_stock_transaction()
-- to post receipts to the existing stock ledger so /inventory, /reports/lab-stock
-- and the daily stock check keep working unchanged when a PO is received.

do $$ begin
  create type edoslmis_po_status as enum (
    'draft','sent','confirmed','partially_received','received','cancelled'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Suppliers
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  name varchar(200) not null,
  contact_person varchar(150),
  phone varchar(30),
  email varchar(150),
  address text,
  notes text,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);
create index if not exists edoslmis_suppliers_tenant_idx on edoslmis_suppliers(tenant_id);
drop trigger if exists edoslmis_trg_suppliers_updated_at on edoslmis_suppliers;
create trigger edoslmis_trg_suppliers_updated_at
  before update on edoslmis_suppliers
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Purchase orders + lines
-- ---------------------------------------------------------------------------
create sequence if not exists edoslmis_po_number_seq;
create or replace function edoslmis_generate_po_number()
returns text
language sql
as $$
  select 'PO-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('edoslmis_po_number_seq')::text, 4, '0');
$$;

create table if not exists edoslmis_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  branch_id uuid references edoshms_branches(id),
  po_number varchar(40) not null,
  supplier_id uuid not null references edoslmis_suppliers(id),
  status edoslmis_po_status not null default 'draft',
  order_date date not null default current_date,
  expected_date date,
  notes text,
  created_by uuid,
  cancelled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, po_number)
);
create index if not exists edoslmis_purchase_orders_tenant_idx on edoslmis_purchase_orders(tenant_id);
create index if not exists edoslmis_purchase_orders_supplier_idx on edoslmis_purchase_orders(supplier_id);
drop trigger if exists edoslmis_trg_purchase_orders_updated_at on edoslmis_purchase_orders;
create trigger edoslmis_trg_purchase_orders_updated_at
  before update on edoslmis_purchase_orders
  for each row execute function edoslmis_set_updated_at();

create table if not exists edoslmis_purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  po_id uuid not null references edoslmis_purchase_orders(id) on delete cascade,
  item_id uuid not null references edoslmis_inventory_items(id),
  quantity_ordered numeric(14,4) not null,
  unit_cost numeric(12,2),
  quantity_received numeric(14,4) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists edoslmis_purchase_order_lines_po_idx on edoslmis_purchase_order_lines(po_id);
create index if not exists edoslmis_purchase_order_lines_item_idx on edoslmis_purchase_order_lines(item_id);

-- ---------------------------------------------------------------------------
-- Receive a PO line: posts a 'receipt' transaction to the existing stock
-- ledger (via the existing edoslmis_record_stock_transaction RPC, so all its
-- authorization/locking/balance logic is reused unchanged), optionally opens
-- a lot/expiry batch, updates the line's received quantity, and rolls the
-- parent PO status forward. Permission check is delegated to
-- edoslmis_record_stock_transaction itself.
-- ---------------------------------------------------------------------------
create or replace function edoslmis_receive_purchase_order_line(
  p_line_id uuid,
  p_quantity numeric,
  p_batch_number text default null,
  p_expiry_date date default null,
  p_notes text default null
)
returns edoslmis_purchase_order_lines
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_line edoslmis_purchase_order_lines;
  v_po edoslmis_purchase_orders;
  v_batch_id uuid;
  v_supplier_name text;
  v_open_lines int;
  v_fully_received_lines int;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity received must be greater than zero';
  end if;

  select * into v_line from edoslmis_purchase_order_lines where id = p_line_id for update;
  if not found then
    raise exception 'Purchase order line % not found', p_line_id;
  end if;

  select * into v_po from edoslmis_purchase_orders where id = v_line.po_id for update;
  if v_po.status in ('received', 'cancelled') then
    raise exception 'Cannot receive against a % purchase order', v_po.status;
  end if;

  select name into v_supplier_name from edoslmis_suppliers where id = v_po.supplier_id;

  if p_batch_number is not null or p_expiry_date is not null then
    insert into edoslmis_stock_batches (
      tenant_id, item_id, batch_number, supplier_name, expiry_date,
      quantity_received, quantity_remaining, unit_cost, created_by
    ) values (
      v_line.tenant_id, v_line.item_id, coalesce(p_batch_number, v_po.po_number), v_supplier_name, p_expiry_date,
      p_quantity, p_quantity, v_line.unit_cost, auth.uid()
    )
    returning id into v_batch_id;
  end if;

  perform edoslmis_record_stock_transaction(
    v_line.item_id, 'receipt', p_quantity, v_batch_id, null,
    coalesce(p_notes, 'Received against ' || v_po.po_number)
  );

  update edoslmis_purchase_order_lines
    set quantity_received = quantity_received + p_quantity
    where id = p_line_id
    returning * into v_line;

  select count(*), count(*) filter (where quantity_received >= quantity_ordered)
    into v_open_lines, v_fully_received_lines
    from edoslmis_purchase_order_lines where po_id = v_po.id;

  update edoslmis_purchase_orders
    set status = case
      when v_fully_received_lines = v_open_lines then 'received'::edoslmis_po_status
      else 'partially_received'::edoslmis_po_status
    end
    where id = v_po.id;

  return v_line;
end;
$$;

grant execute on function edoslmis_receive_purchase_order_line(uuid, numeric, text, date, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS — same tenant-scoped-read / edoslmis.inventory.manage-write pattern
-- already used for every other inventory table.
-- ---------------------------------------------------------------------------
alter table edoslmis_suppliers enable row level security;
drop policy if exists edoslmis_suppliers_select on edoslmis_suppliers;
create policy edoslmis_suppliers_select on edoslmis_suppliers
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
drop policy if exists edoslmis_suppliers_write on edoslmis_suppliers;
create policy edoslmis_suppliers_write on edoslmis_suppliers
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_purchase_orders enable row level security;
drop policy if exists edoslmis_purchase_orders_select on edoslmis_purchase_orders;
create policy edoslmis_purchase_orders_select on edoslmis_purchase_orders
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
drop policy if exists edoslmis_purchase_orders_write on edoslmis_purchase_orders;
create policy edoslmis_purchase_orders_write on edoslmis_purchase_orders
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_purchase_order_lines enable row level security;
drop policy if exists edoslmis_purchase_order_lines_select on edoslmis_purchase_order_lines;
create policy edoslmis_purchase_order_lines_select on edoslmis_purchase_order_lines
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
drop policy if exists edoslmis_purchase_order_lines_write on edoslmis_purchase_order_lines;
create policy edoslmis_purchase_order_lines_write on edoslmis_purchase_order_lines
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(tenant_id))
  );
