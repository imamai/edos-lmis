-- EDOS LMIS Phase 14 — Request for Quotation (RFQ)
-- Additive only. Lets staff ask one or more suppliers for pricing before
-- committing to a purchase order. No inbound email parsing exists, so a
-- supplier's quoted price is recorded manually by staff once they reply
-- (phone/email/WhatsApp, outside the system) — mirrors how PO "sent" and
-- "confirmed" are already manual staff-recorded steps.
-- Reuses 'edoslmis.inventory.manage' (same permission as suppliers/POs, per
-- the precedent set in 0026_edoslmis_procurement.sql) rather than a new
-- permission string.

do $$ begin
  create type edoslmis_rfq_status as enum (
    'draft','sent','closed','converted','cancelled'
  );
exception when duplicate_object then null; end $$;

create sequence if not exists edoslmis_rfq_number_seq;
create or replace function edoslmis_generate_rfq_number()
returns text
language sql
as $$
  select 'RFQ-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('edoslmis_rfq_number_seq')::text, 4, '0');
$$;

create table if not exists edoslmis_rfqs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  branch_id uuid references edoshms_branches(id),
  rfq_number varchar(40) not null,
  status edoslmis_rfq_status not null default 'draft',
  notes text,
  expected_date date,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, rfq_number)
);
create index if not exists edoslmis_rfqs_tenant_idx on edoslmis_rfqs(tenant_id);
drop trigger if exists edoslmis_trg_rfqs_updated_at on edoslmis_rfqs;
create trigger edoslmis_trg_rfqs_updated_at
  before update on edoslmis_rfqs
  for each row execute function edoslmis_set_updated_at();

create table if not exists edoslmis_rfq_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  rfq_id uuid not null references edoslmis_rfqs(id) on delete cascade,
  item_id uuid not null references edoslmis_inventory_items(id),
  quantity_requested numeric(14,4) not null,
  created_at timestamptz not null default now()
);
create index if not exists edoslmis_rfq_lines_rfq_idx on edoslmis_rfq_lines(rfq_id);

create table if not exists edoslmis_rfq_suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  rfq_id uuid not null references edoslmis_rfqs(id) on delete cascade,
  supplier_id uuid not null references edoslmis_suppliers(id),
  sent_at timestamptz,
  responded_at timestamptz,
  quoted_total numeric(14,2),
  response_notes text,
  created_at timestamptz not null default now(),
  unique (rfq_id, supplier_id)
);
create index if not exists edoslmis_rfq_suppliers_rfq_idx on edoslmis_rfq_suppliers(rfq_id);
create index if not exists edoslmis_rfq_suppliers_supplier_idx on edoslmis_rfq_suppliers(supplier_id);

-- ---------------------------------------------------------------------------
-- RLS — same tenant-scoped-read / edoslmis.inventory.manage-write pattern
-- already used for suppliers/purchase orders.
-- ---------------------------------------------------------------------------
alter table edoslmis_rfqs enable row level security;
drop policy if exists edoslmis_rfqs_select on edoslmis_rfqs;
create policy edoslmis_rfqs_select on edoslmis_rfqs
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
drop policy if exists edoslmis_rfqs_write on edoslmis_rfqs;
create policy edoslmis_rfqs_write on edoslmis_rfqs
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_rfq_lines enable row level security;
drop policy if exists edoslmis_rfq_lines_select on edoslmis_rfq_lines;
create policy edoslmis_rfq_lines_select on edoslmis_rfq_lines
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
drop policy if exists edoslmis_rfq_lines_write on edoslmis_rfq_lines;
create policy edoslmis_rfq_lines_write on edoslmis_rfq_lines
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_rfq_suppliers enable row level security;
drop policy if exists edoslmis_rfq_suppliers_select on edoslmis_rfq_suppliers;
create policy edoslmis_rfq_suppliers_select on edoslmis_rfq_suppliers
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
drop policy if exists edoslmis_rfq_suppliers_write on edoslmis_rfq_suppliers;
create policy edoslmis_rfq_suppliers_write on edoslmis_rfq_suppliers
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(tenant_id))
  );
