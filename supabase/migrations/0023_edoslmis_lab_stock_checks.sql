-- EDOS LMIS Phase 5 — daily lab stock check (reconciliation grid)
-- One row per commodity per calendar day. Flow columns (beginning_balance, receipts,
-- usage, wastage, adjustments) are derived from edoslmis_stock_transactions /
-- edoslmis_stock_batches at save time and stored so historical reports don't shift
-- if later transactions are backdated. Manual columns (tests_done, qaqc_repeats,
-- stocked_out_qty, physical_count, quantity_required_supply) are entered by staff
-- during the count. computed_expected_balance is stored alongside physical_count so
-- reports can flag reconciliation discrepancies without recomputing the ledger.

create table if not exists edoslmis_lab_stock_checks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  branch_id uuid references edoshms_branches(id),
  item_id uuid not null references edoslmis_inventory_items(id) on delete cascade,
  check_date date not null default current_date,
  beginning_balance numeric(14,4) not null default 0,
  qty_received numeric(14,4) not null default 0,
  qty_received_other_sources numeric(14,4) not null default 0,
  quantity_used numeric(14,4) not null default 0,
  losses_wastage numeric(14,4) not null default 0,
  positive_adjustments numeric(14,4) not null default 0,
  negative_adjustments numeric(14,4) not null default 0,
  expiring_under_6months numeric(14,4) not null default 0,
  computed_expected_balance numeric(14,4) not null default 0,
  tests_done numeric(14,4) not null default 0,
  qaqc_repeats numeric(14,4) not null default 0,
  stocked_out_qty numeric(14,4) not null default 0,
  physical_count numeric(14,4) not null default 0,
  quantity_required_supply numeric(14,4) not null default 0,
  notes text,
  performed_by uuid references edoshms_user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, item_id, check_date)
);
create index if not exists edoslmis_lab_stock_checks_tenant_idx on edoslmis_lab_stock_checks(tenant_id, check_date);
create index if not exists edoslmis_lab_stock_checks_item_idx on edoslmis_lab_stock_checks(item_id, check_date);
drop trigger if exists edoslmis_trg_lab_stock_checks_updated_at on edoslmis_lab_stock_checks;
create trigger edoslmis_trg_lab_stock_checks_updated_at
  before update on edoslmis_lab_stock_checks
  for each row execute function edoslmis_set_updated_at();

alter table edoslmis_lab_stock_checks enable row level security;
drop policy if exists edoslmis_lab_stock_checks_select on edoslmis_lab_stock_checks;
create policy edoslmis_lab_stock_checks_select on edoslmis_lab_stock_checks
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
drop policy if exists edoslmis_lab_stock_checks_write on edoslmis_lab_stock_checks;
create policy edoslmis_lab_stock_checks_write on edoslmis_lab_stock_checks
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(tenant_id))
  );
