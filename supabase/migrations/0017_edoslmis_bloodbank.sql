-- EDOS LMIS Phase 3 — blood bank: donors, units, crossmatch, transfusion, reactions

do $$ begin
  create type edoslmis_blood_group as enum (
    'A_pos','A_neg','B_pos','B_neg','AB_pos','AB_neg','O_pos','O_neg'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_blood_component as enum (
    'whole_blood','packed_red_cells','fresh_frozen_plasma','platelet_concentrate','cryoprecipitate'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_donor_type as enum ('voluntary','replacement','autologous');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_blood_unit_status as enum (
    'quarantine','available','reserved','issued','discarded','expired'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_screening_result as enum ('pending','non_reactive','reactive');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_crossmatch_status as enum ('pending','completed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_crossmatch_result as enum ('compatible','incompatible');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_transfusion_status as enum ('issued','in_progress','completed','discontinued');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_reaction_severity as enum ('mild','moderate','severe');
exception when duplicate_object then null; end $$;

create sequence if not exists edoslmis_donor_number_seq;
create or replace function edoslmis_generate_donor_number()
returns text
language sql
as $$
  select 'DNR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('edoslmis_donor_number_seq')::text, 6, '0');
$$;

create sequence if not exists edoslmis_blood_unit_number_seq;
create or replace function edoslmis_generate_blood_unit_number()
returns text
language sql
as $$
  select 'BBU-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('edoslmis_blood_unit_number_seq')::text, 5, '0');
$$;

-- ---------------------------------------------------------------------------
-- Donors
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_bb_donors (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  branch_id uuid references edoshms_branches(id),
  donor_number varchar(40) not null,
  first_name varchar(100) not null,
  last_name varchar(100) not null,
  gender edoslmis_gender,
  date_of_birth date,
  phone varchar(30),
  national_id varchar(30),
  donor_type edoslmis_donor_type not null default 'voluntary',
  blood_group edoslmis_blood_group,
  last_donation_date date,
  deferred_until date,
  deferral_reason text,
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, donor_number)
);
create index if not exists edoslmis_bb_donors_tenant_idx on edoslmis_bb_donors(tenant_id);
create trigger edoslmis_trg_bb_donors_updated_at
  before update on edoslmis_bb_donors
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Blood units (donations / inventory)
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_bb_blood_units (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  branch_id uuid references edoshms_branches(id),
  unit_number varchar(40) not null,
  donor_id uuid references edoslmis_bb_donors(id),
  blood_group edoslmis_blood_group not null,
  component edoslmis_blood_component not null default 'whole_blood',
  volume_ml integer not null default 450,
  collection_date date not null default current_date,
  expiry_date date not null,
  status edoslmis_blood_unit_status not null default 'quarantine',
  screening_hiv edoslmis_screening_result not null default 'pending',
  screening_hbsag edoslmis_screening_result not null default 'pending',
  screening_hcv edoslmis_screening_result not null default 'pending',
  screening_syphilis edoslmis_screening_result not null default 'pending',
  storage_location varchar(100),
  discard_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, unit_number)
);
create index if not exists edoslmis_bb_blood_units_tenant_idx on edoslmis_bb_blood_units(tenant_id);
create index if not exists edoslmis_bb_blood_units_status_idx on edoslmis_bb_blood_units(status);
create index if not exists edoslmis_bb_blood_units_group_idx on edoslmis_bb_blood_units(blood_group, component);
create index if not exists edoslmis_bb_blood_units_expiry_idx on edoslmis_bb_blood_units(expiry_date);
create trigger edoslmis_trg_bb_blood_units_updated_at
  before update on edoslmis_bb_blood_units
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Crossmatch requests (pre-transfusion testing request for a patient)
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_bb_crossmatch_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  branch_id uuid references edoshms_branches(id),
  order_id uuid references edoslmis_orders(id),
  patient_id uuid not null references edoslmis_patients(id),
  patient_blood_group edoslmis_blood_group,
  component_requested edoslmis_blood_component not null default 'packed_red_cells',
  units_requested integer not null default 1,
  indication text,
  status edoslmis_crossmatch_status not null default 'pending',
  requested_by uuid references edoshms_user_profiles(id),
  requested_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists edoslmis_bb_crossmatch_requests_tenant_idx on edoslmis_bb_crossmatch_requests(tenant_id);
create index if not exists edoslmis_bb_crossmatch_requests_patient_idx on edoslmis_bb_crossmatch_requests(patient_id);
create trigger edoslmis_trg_bb_crossmatch_requests_updated_at
  before update on edoslmis_bb_crossmatch_requests
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Crossmatch results (compatibility testing of a specific unit against a request)
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_bb_crossmatch_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  crossmatch_request_id uuid not null references edoslmis_bb_crossmatch_requests(id) on delete cascade,
  blood_unit_id uuid not null references edoslmis_bb_blood_units(id),
  method varchar(100) not null default 'gel',
  result edoslmis_crossmatch_result not null,
  performed_by uuid references edoshms_user_profiles(id),
  performed_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists edoslmis_bb_crossmatch_results_tenant_idx on edoslmis_bb_crossmatch_results(tenant_id);
create index if not exists edoslmis_bb_crossmatch_results_request_idx on edoslmis_bb_crossmatch_results(crossmatch_request_id);
create index if not exists edoslmis_bb_crossmatch_results_unit_idx on edoslmis_bb_crossmatch_results(blood_unit_id);

-- ---------------------------------------------------------------------------
-- Transfusions (issuing a compatible unit and administering it)
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_bb_transfusions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  branch_id uuid references edoshms_branches(id),
  crossmatch_result_id uuid references edoslmis_bb_crossmatch_results(id),
  blood_unit_id uuid not null references edoslmis_bb_blood_units(id),
  patient_id uuid not null references edoslmis_patients(id),
  ward_location varchar(150),
  status edoslmis_transfusion_status not null default 'issued',
  issued_by uuid references edoshms_user_profiles(id),
  issued_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz,
  pre_transfusion_vitals jsonb not null default '{}'::jsonb,
  post_transfusion_vitals jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists edoslmis_bb_transfusions_tenant_idx on edoslmis_bb_transfusions(tenant_id);
create index if not exists edoslmis_bb_transfusions_patient_idx on edoslmis_bb_transfusions(patient_id);
create index if not exists edoslmis_bb_transfusions_unit_idx on edoslmis_bb_transfusions(blood_unit_id);
create trigger edoslmis_trg_bb_transfusions_updated_at
  before update on edoslmis_bb_transfusions
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Transfusion reactions
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_bb_transfusion_reactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  transfusion_id uuid not null references edoslmis_bb_transfusions(id) on delete cascade,
  reaction_type varchar(150) not null,
  severity edoslmis_reaction_severity not null default 'mild',
  onset_at timestamptz not null default now(),
  symptoms text,
  action_taken text,
  reported_by uuid references edoshms_user_profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists edoslmis_bb_transfusion_reactions_tenant_idx on edoslmis_bb_transfusion_reactions(tenant_id);
create index if not exists edoslmis_bb_transfusion_reactions_transfusion_idx on edoslmis_bb_transfusion_reactions(transfusion_id);

-- ---------------------------------------------------------------------------
-- Trigger: a compatible crossmatch result reserves the unit; an issued
-- transfusion marks the unit as issued (irreversible once administered).
-- ---------------------------------------------------------------------------
create or replace function edoslmis_apply_crossmatch_result()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.result = 'compatible' then
    update edoslmis_bb_blood_units
    set status = 'reserved'
    where id = new.blood_unit_id and status = 'available';
  end if;
  return new;
end;
$$;

create trigger edoslmis_trg_apply_crossmatch_result
  after insert on edoslmis_bb_crossmatch_results
  for each row execute function edoslmis_apply_crossmatch_result();

create or replace function edoslmis_apply_transfusion_issue()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update edoslmis_bb_blood_units set status = 'issued' where id = new.blood_unit_id;
  return new;
end;
$$;

create trigger edoslmis_trg_apply_transfusion_issue
  after insert on edoslmis_bb_transfusions
  for each row execute function edoslmis_apply_transfusion_issue();

-- ---------------------------------------------------------------------------
-- Permission grant
-- ---------------------------------------------------------------------------
update edoshms_roles
set permissions = permissions || '["edoslmis.bloodbank.manage"]'::jsonb
where tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87'
  and code = 'lab_manager'
  and not (permissions @> '["edoslmis.bloodbank.manage"]'::jsonb);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table edoslmis_bb_donors enable row level security;
create policy edoslmis_bb_donors_select on edoslmis_bb_donors
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_bb_donors_write on edoslmis_bb_donors
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.bloodbank.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.bloodbank.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_bb_blood_units enable row level security;
create policy edoslmis_bb_blood_units_select on edoslmis_bb_blood_units
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_bb_blood_units_write on edoslmis_bb_blood_units
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.bloodbank.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.bloodbank.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_bb_crossmatch_requests enable row level security;
create policy edoslmis_bb_crossmatch_requests_select on edoslmis_bb_crossmatch_requests
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_bb_crossmatch_requests_write on edoslmis_bb_crossmatch_requests
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.bloodbank.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.bloodbank.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_bb_crossmatch_results enable row level security;
create policy edoslmis_bb_crossmatch_results_select on edoslmis_bb_crossmatch_results
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_bb_crossmatch_results_write on edoslmis_bb_crossmatch_results
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.bloodbank.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.bloodbank.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_bb_transfusions enable row level security;
create policy edoslmis_bb_transfusions_select on edoslmis_bb_transfusions
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_bb_transfusions_write on edoslmis_bb_transfusions
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.bloodbank.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.bloodbank.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_bb_transfusion_reactions enable row level security;
create policy edoslmis_bb_transfusion_reactions_select on edoslmis_bb_transfusion_reactions
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_bb_transfusion_reactions_write on edoslmis_bb_transfusion_reactions
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.bloodbank.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.bloodbank.manage') or edoslmis_is_admin_for(tenant_id))
  );
