-- EDOS LMIS Phase 10 — quotations
-- Additive only: no existing table, function, or policy is modified.
-- Reuses the existing 'edoslmis.billing.manage' permission (same permission
-- that already gates invoices/payments/claims) rather than introducing a new
-- permission string, since quotations are a finance-facing document like
-- invoices. Quotation line items are free text (not tied to the inventory or
-- test catalog) since quotations are often for goods/services not yet
-- modeled in either catalog.

do $$ begin
  create type edoslmis_quotation_status as enum (
    'draft','sent','accepted','rejected','expired'
  );
exception when duplicate_object then null; end $$;

create sequence if not exists edoslmis_quotation_number_seq;
create or replace function edoslmis_generate_quotation_number()
returns text
language sql
as $$
  select 'QT-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('edoslmis_quotation_number_seq')::text, 4, '0');
$$;

-- ---------------------------------------------------------------------------
-- Quotations
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_quotations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  branch_id uuid references edoshms_branches(id),
  quotation_number varchar(40) not null,
  customer_name varchar(200),
  status edoslmis_quotation_status not null default 'draft',
  quote_date date not null default current_date,
  valid_until date,
  notes text,
  subtotal numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, quotation_number)
);
create index if not exists edoslmis_quotations_tenant_idx on edoslmis_quotations(tenant_id);
create index if not exists edoslmis_quotations_status_idx on edoslmis_quotations(status);
drop trigger if exists edoslmis_trg_quotations_updated_at on edoslmis_quotations;
create trigger edoslmis_trg_quotations_updated_at
  before update on edoslmis_quotations
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Quotation line items
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_quotation_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  quotation_id uuid not null references edoslmis_quotations(id) on delete cascade,
  description varchar(250) not null,
  quantity numeric(10,2) not null default 1,
  unit_of_measure varchar(30) not null default 'piece',
  unit_price numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists edoslmis_quotation_items_tenant_idx on edoslmis_quotation_items(tenant_id);
create index if not exists edoslmis_quotation_items_quotation_idx on edoslmis_quotation_items(quotation_id);

-- ---------------------------------------------------------------------------
-- RLS — same tenant-scoped-read / edoslmis.billing.manage-write pattern
-- already used for invoices/payments/claims.
-- ---------------------------------------------------------------------------
alter table edoslmis_quotations enable row level security;
drop policy if exists edoslmis_quotations_select on edoslmis_quotations;
create policy edoslmis_quotations_select on edoslmis_quotations
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
drop policy if exists edoslmis_quotations_write on edoslmis_quotations;
create policy edoslmis_quotations_write on edoslmis_quotations
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.billing.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.billing.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_quotation_items enable row level security;
drop policy if exists edoslmis_quotation_items_select on edoslmis_quotation_items;
create policy edoslmis_quotation_items_select on edoslmis_quotation_items
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
drop policy if exists edoslmis_quotation_items_write on edoslmis_quotation_items;
create policy edoslmis_quotation_items_write on edoslmis_quotation_items
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.billing.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.billing.manage') or edoslmis_is_admin_for(tenant_id))
  );
