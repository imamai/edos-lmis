-- EDOS LMIS Phase 1 (extension) — commodity/reagent stock ledger
-- Opening balance -> receipts -> test usage -> +/- adjustments -> running closing balance.

do $$ begin
  create type edoslmis_inventory_category as enum (
    'reagent','consumable','glassware','chemical','kit','calibrator','control','other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_stock_transaction_type as enum (
    'opening_balance','receipt','test_usage','positive_adjustment','negative_adjustment',
    'wastage','expiry','transfer_in','transfer_out','stock_count_correction'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Inventory items (commodity master list)
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_inventory_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  branch_id uuid references edoshms_branches(id),
  department_id uuid references edoslmis_departments(id),
  category edoslmis_inventory_category not null default 'reagent',
  code varchar(30) not null,
  name varchar(200) not null,
  unit_of_measure varchar(30) not null default 'unit',
  reorder_level numeric(14,4) not null default 0,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);
create index if not exists edoslmis_inventory_items_tenant_idx on edoslmis_inventory_items(tenant_id);
create index if not exists edoslmis_inventory_items_branch_idx on edoslmis_inventory_items(branch_id);
create trigger edoslmis_trg_inventory_items_updated_at
  before update on edoslmis_inventory_items
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Stock batches (lot/expiry tracking, supports FEFO)
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_stock_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  item_id uuid not null references edoslmis_inventory_items(id) on delete cascade,
  batch_number varchar(60) not null,
  supplier_name varchar(200),
  expiry_date date,
  quantity_received numeric(14,4) not null default 0,
  quantity_remaining numeric(14,4) not null default 0,
  unit_cost numeric(12,2),
  received_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists edoslmis_stock_batches_tenant_idx on edoslmis_stock_batches(tenant_id);
create index if not exists edoslmis_stock_batches_item_idx on edoslmis_stock_batches(item_id);
create index if not exists edoslmis_stock_batches_expiry_idx on edoslmis_stock_batches(expiry_date);
create trigger edoslmis_trg_stock_batches_updated_at
  before update on edoslmis_stock_batches
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Stock transactions (the ledger). quantity_change is signed: +in / -out.
-- balance_after is the running balance for the item immediately after this row.
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_stock_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  branch_id uuid references edoshms_branches(id),
  item_id uuid not null references edoslmis_inventory_items(id),
  batch_id uuid references edoslmis_stock_batches(id),
  transaction_type edoslmis_stock_transaction_type not null,
  quantity_change numeric(14,4) not null,
  balance_after numeric(14,4) not null,
  reference_order_test_id uuid references edoslmis_order_tests(id),
  notes text,
  performed_by uuid references edoshms_user_profiles(id),
  performed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists edoslmis_stock_transactions_tenant_idx on edoslmis_stock_transactions(tenant_id);
create index if not exists edoslmis_stock_transactions_item_idx on edoslmis_stock_transactions(item_id, performed_at);
create index if not exists edoslmis_stock_transactions_reference_idx on edoslmis_stock_transactions(reference_order_test_id);

-- ---------------------------------------------------------------------------
-- Test -> reagent consumption mapping (drives automatic deduction on result entry)
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_test_reagent_usage (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  test_id uuid not null references edoslmis_tests(id) on delete cascade,
  item_id uuid not null references edoslmis_inventory_items(id) on delete cascade,
  quantity_per_test numeric(14,4) not null default 1,
  created_at timestamptz not null default now(),
  unique (test_id, item_id)
);
create index if not exists edoslmis_test_reagent_usage_test_idx on edoslmis_test_reagent_usage(test_id);
create index if not exists edoslmis_test_reagent_usage_item_idx on edoslmis_test_reagent_usage(item_id);

-- ---------------------------------------------------------------------------
-- Ledger-writer function: locks the item row to serialize concurrent writers,
-- computes the new running balance, and inserts the transaction row.
-- ---------------------------------------------------------------------------
create or replace function edoslmis_record_stock_transaction(
  p_item_id uuid,
  p_transaction_type edoslmis_stock_transaction_type,
  p_quantity_change numeric,
  p_batch_id uuid default null,
  p_reference_order_test_id uuid default null,
  p_notes text default null
)
returns edoslmis_stock_transactions
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tenant_id uuid;
  v_branch_id uuid;
  v_prev_balance numeric;
  v_row edoslmis_stock_transactions;
  v_authorized boolean;
begin
  select tenant_id, branch_id into v_tenant_id, v_branch_id
  from edoslmis_inventory_items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Inventory item % not found', p_item_id;
  end if;

  if v_tenant_id <> edoshms_get_tenant_id() and not edoshms_is_platform_admin() then
    raise exception 'Not authorized for this tenant';
  end if;

  if p_transaction_type = 'test_usage' then
    v_authorized := edoslmis_has_permission('edoslmis.result.enter') or edoslmis_is_admin_for(v_tenant_id);
  else
    v_authorized := edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(v_tenant_id);
  end if;

  if not v_authorized then
    raise exception 'Not authorized to record this stock transaction';
  end if;

  select coalesce(max(balance_after), 0) into v_prev_balance
  from edoslmis_stock_transactions
  where item_id = p_item_id;

  insert into edoslmis_stock_transactions (
    tenant_id, branch_id, item_id, batch_id, transaction_type,
    quantity_change, balance_after, reference_order_test_id, notes, performed_by
  ) values (
    v_tenant_id, v_branch_id, p_item_id, p_batch_id, p_transaction_type,
    p_quantity_change, v_prev_balance + p_quantity_change, p_reference_order_test_id, p_notes, auth.uid()
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function edoslmis_record_stock_transaction(uuid, edoslmis_stock_transaction_type, numeric, uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table edoslmis_inventory_items enable row level security;
create policy edoslmis_inventory_items_select on edoslmis_inventory_items
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_inventory_items_write on edoslmis_inventory_items
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_stock_batches enable row level security;
create policy edoslmis_stock_batches_select on edoslmis_stock_batches
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_stock_batches_write on edoslmis_stock_batches
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_stock_transactions enable row level security;
create policy edoslmis_stock_transactions_select on edoslmis_stock_transactions
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_stock_transactions_insert on edoslmis_stock_transactions
  for insert with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_test_reagent_usage enable row level security;
create policy edoslmis_test_reagent_usage_select on edoslmis_test_reagent_usage
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_test_reagent_usage_write on edoslmis_test_reagent_usage
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(tenant_id))
  );
