-- EDOS LMIS — supplier catalogue (per-supplier price list)
--
-- Lets a supplier's known price per commodity be recorded once and reused
-- when building a Purchase Order, instead of retyping unit_cost by hand
-- every time. Purely a pricing reference — it does not restrict which items
-- can be ordered from a supplier, and applying a catalogue price to a PO
-- line remains an explicit, editable action (never silently overwrites a
-- price already typed in).

create table if not exists edoslmis_supplier_catalog_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  supplier_id uuid not null references edoslmis_suppliers(id) on delete cascade,
  item_id uuid not null references edoslmis_inventory_items(id) on delete cascade,
  unit_price numeric(12,2) not null default 0,
  supplier_sku varchar(60),
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, supplier_id, item_id)
);
create index if not exists edoslmis_supplier_catalog_items_tenant_idx on edoslmis_supplier_catalog_items(tenant_id);
create index if not exists edoslmis_supplier_catalog_items_supplier_idx on edoslmis_supplier_catalog_items(supplier_id);
create trigger edoslmis_trg_supplier_catalog_items_updated_at
  before update on edoslmis_supplier_catalog_items
  for each row execute function edoslmis_set_updated_at();

alter table edoslmis_supplier_catalog_items enable row level security;
create policy edoslmis_supplier_catalog_items_select on edoslmis_supplier_catalog_items
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_supplier_catalog_items_write on edoslmis_supplier_catalog_items
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.inventory.manage') or edoslmis_is_admin_for(tenant_id))
  );
