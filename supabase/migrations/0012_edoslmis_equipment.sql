-- EDOS LMIS Phase 2 — equipment & maintenance management
-- Genuinely new domain: no existing equivalent anywhere in edos_db.

do $$ begin
  create type edoslmis_equipment_type as enum (
    'analyzer','microscope','centrifuge','incubator','refrigerator','freezer',
    'autoclave','water_bath','pipette','balance','pcr_machine','blood_bank_fridge',
    'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_equipment_status as enum (
    'operational','under_maintenance','out_of_service','decommissioned'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_maintenance_type as enum (
    'preventive','corrective','calibration','validation','installation'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Equipment master list
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_equipment (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  branch_id uuid references edoshms_branches(id),
  department_id uuid references edoslmis_departments(id),
  code varchar(30) not null,
  name varchar(200) not null,
  equipment_type edoslmis_equipment_type not null default 'other',
  manufacturer varchar(150),
  model varchar(150),
  serial_number varchar(100),
  asset_tag varchar(60),
  location varchar(150),
  status edoslmis_equipment_status not null default 'operational',
  installation_date date,
  warranty_expiry date,
  calibration_interval_days integer,
  last_calibration_date date,
  next_calibration_due date,
  maintenance_interval_days integer,
  last_maintenance_date date,
  next_maintenance_due date,
  is_active boolean not null default true,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);
create index if not exists edoslmis_equipment_tenant_idx on edoslmis_equipment(tenant_id);
create index if not exists edoslmis_equipment_branch_idx on edoslmis_equipment(branch_id);
create index if not exists edoslmis_equipment_department_idx on edoslmis_equipment(department_id);
create index if not exists edoslmis_equipment_calibration_due_idx on edoslmis_equipment(next_calibration_due);
create index if not exists edoslmis_equipment_maintenance_due_idx on edoslmis_equipment(next_maintenance_due);
create trigger edoslmis_trg_equipment_updated_at
  before update on edoslmis_equipment
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Maintenance / calibration / validation service log
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_equipment_maintenance_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  equipment_id uuid not null references edoslmis_equipment(id) on delete cascade,
  maintenance_type edoslmis_maintenance_type not null,
  performed_by uuid references edoshms_user_profiles(id),
  vendor_name varchar(200),
  description text,
  cost numeric(12,2),
  downtime_hours numeric(8,2) not null default 0,
  performed_at timestamptz not null default now(),
  next_due_date date,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists edoslmis_equipment_maintenance_logs_tenant_idx on edoslmis_equipment_maintenance_logs(tenant_id);
create index if not exists edoslmis_equipment_maintenance_logs_equipment_idx on edoslmis_equipment_maintenance_logs(equipment_id, performed_at);

-- ---------------------------------------------------------------------------
-- Downtime / breakdown incidents (drives uptime % metric)
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_equipment_downtime_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  equipment_id uuid not null references edoslmis_equipment(id) on delete cascade,
  reason text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  reported_by uuid references edoshms_user_profiles(id),
  resolved_by uuid references edoshms_user_profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists edoslmis_equipment_downtime_logs_tenant_idx on edoslmis_equipment_downtime_logs(tenant_id);
create index if not exists edoslmis_equipment_downtime_logs_equipment_idx on edoslmis_equipment_downtime_logs(equipment_id, started_at);

-- ---------------------------------------------------------------------------
-- Link results to the instrument that produced them (Phase 1 placeholder)
-- ---------------------------------------------------------------------------
alter table edoslmis_result_entries
  add column if not exists equipment_id uuid references edoslmis_equipment(id);
create index if not exists edoslmis_result_entries_equipment_idx on edoslmis_result_entries(equipment_id);

-- ---------------------------------------------------------------------------
-- Trigger: after a maintenance/calibration log is inserted, roll the
-- equipment record's last_/next_ due dates forward automatically.
-- ---------------------------------------------------------------------------
create or replace function edoslmis_apply_maintenance_log()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.maintenance_type = 'calibration' then
    update edoslmis_equipment
    set last_calibration_date = new.performed_at::date,
        next_calibration_due = coalesce(
          new.next_due_date,
          case when calibration_interval_days is not null
            then new.performed_at::date + calibration_interval_days
            else next_calibration_due end
        ),
        status = case when status = 'under_maintenance' then 'operational' else status end
    where id = new.equipment_id;
  else
    update edoslmis_equipment
    set last_maintenance_date = new.performed_at::date,
        next_maintenance_due = coalesce(
          new.next_due_date,
          case when maintenance_interval_days is not null
            then new.performed_at::date + maintenance_interval_days
            else next_maintenance_due end
        ),
        status = case when status = 'under_maintenance' then 'operational' else status end
    where id = new.equipment_id;
  end if;
  return new;
end;
$$;

create trigger edoslmis_trg_apply_maintenance_log
  after insert on edoslmis_equipment_maintenance_logs
  for each row execute function edoslmis_apply_maintenance_log();

-- ---------------------------------------------------------------------------
-- Trigger: closing a downtime log (setting ended_at) flips equipment back to
-- operational; opening one (insert with no ended_at) marks it out_of_service.
-- ---------------------------------------------------------------------------
create or replace function edoslmis_apply_downtime_log()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if TG_OP = 'INSERT' and new.ended_at is null then
    update edoslmis_equipment set status = 'out_of_service' where id = new.equipment_id;
  elsif new.ended_at is not null and (TG_OP = 'INSERT' or old.ended_at is null) then
    update edoslmis_equipment set status = 'operational' where id = new.equipment_id;
  end if;
  return new;
end;
$$;

create trigger edoslmis_trg_apply_downtime_log
  after insert or update on edoslmis_equipment_downtime_logs
  for each row execute function edoslmis_apply_downtime_log();

-- ---------------------------------------------------------------------------
-- Permission grant
-- ---------------------------------------------------------------------------
update edoshms_roles
set permissions = permissions || '["edoslmis.equipment.manage"]'::jsonb
where tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87'
  and code = 'lab_manager'
  and not (permissions @> '["edoslmis.equipment.manage"]'::jsonb);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table edoslmis_equipment enable row level security;
create policy edoslmis_equipment_select on edoslmis_equipment
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_equipment_write on edoslmis_equipment
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.equipment.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.equipment.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_equipment_maintenance_logs enable row level security;
create policy edoslmis_equipment_maintenance_logs_select on edoslmis_equipment_maintenance_logs
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_equipment_maintenance_logs_insert on edoslmis_equipment_maintenance_logs
  for insert with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.equipment.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_equipment_downtime_logs enable row level security;
create policy edoslmis_equipment_downtime_logs_select on edoslmis_equipment_downtime_logs
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_equipment_downtime_logs_write on edoslmis_equipment_downtime_logs
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.equipment.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.equipment.manage') or edoslmis_is_admin_for(tenant_id))
  );
