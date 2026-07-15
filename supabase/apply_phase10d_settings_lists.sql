-- EDOS LMIS Phase 10d — admin-mutable classification lists (Settings)
-- Replaces the two hardcoded classification pickers that had no branching
-- logic anywhere else in the app (commodity category, equipment type) with
-- one reusable tenant-scoped picklist table, editable from /settings.
-- Deliberately NOT applied to workflow/status enums (order/invoice/PO/QC/
-- crossmatch status, etc.) — application code branches on those exact
-- values, so making them free text would silently break business logic.
-- Deliberately NOT a foreign key from edoslmis_inventory_items.category /
-- edoslmis_equipment.equipment_type — those stay plain strings, so deleting
-- a picklist entry can never orphan or cascade into existing records.

create table if not exists edoslmis_settings_lists (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  list_key varchar(50) not null,
  value varchar(50) not null,
  label varchar(100) not null,
  sort_order int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (tenant_id, list_key, value)
);
create index if not exists edoslmis_settings_lists_tenant_idx on edoslmis_settings_lists(tenant_id, list_key);

alter table edoslmis_settings_lists enable row level security;
drop policy if exists edoslmis_settings_lists_select on edoslmis_settings_lists;
create policy edoslmis_settings_lists_select on edoslmis_settings_lists
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
drop policy if exists edoslmis_settings_lists_write on edoslmis_settings_lists;
create policy edoslmis_settings_lists_write on edoslmis_settings_lists
  for all using (
    tenant_id = edoshms_get_tenant_id() and edoslmis_is_admin_for(tenant_id)
  ) with check (
    tenant_id = edoshms_get_tenant_id() and edoslmis_is_admin_for(tenant_id)
  );

-- ---------------------------------------------------------------------------
-- Seed the current fixed values so both dropdowns look identical right after
-- migrating — nothing changes until an admin edits the list from Settings.
-- ---------------------------------------------------------------------------
insert into edoslmis_settings_lists (tenant_id, list_key, value, label, sort_order)
values
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'inventory_category', 'reagent', 'Reagent', 1),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'inventory_category', 'consumable', 'Consumable', 2),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'inventory_category', 'glassware', 'Glassware', 3),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'inventory_category', 'chemical', 'Chemical', 4),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'inventory_category', 'kit', 'Kit', 5),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'inventory_category', 'calibrator', 'Calibrator', 6),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'inventory_category', 'control', 'Control', 7),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'inventory_category', 'other', 'Other', 8),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'equipment_type', 'analyzer', 'Analyzer', 1),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'equipment_type', 'microscope', 'Microscope', 2),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'equipment_type', 'centrifuge', 'Centrifuge', 3),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'equipment_type', 'incubator', 'Incubator', 4),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'equipment_type', 'refrigerator', 'Refrigerator', 5),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'equipment_type', 'freezer', 'Freezer', 6),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'equipment_type', 'autoclave', 'Autoclave', 7),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'equipment_type', 'water_bath', 'Water Bath', 8),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'equipment_type', 'pipette', 'Pipette', 9),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'equipment_type', 'balance', 'Balance', 10),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'equipment_type', 'pcr_machine', 'PCR Machine', 11),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'equipment_type', 'blood_bank_fridge', 'Blood Bank Fridge', 12),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'equipment_type', 'other', 'Other', 13)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Drop the fixed-enum constraint on the two columns this feeds. The enum
-- types themselves are left in place (unused) — no drop-type dependency
-- risk, and other columns using edoslmis_inventory_category-shaped values
-- elsewhere are unaffected.
-- ---------------------------------------------------------------------------
alter table edoslmis_inventory_items
  alter column category type varchar(50) using category::text,
  alter column category set default 'reagent';

alter table edoslmis_equipment
  alter column equipment_type type varchar(50) using equipment_type::text,
  alter column equipment_type set default 'other';
