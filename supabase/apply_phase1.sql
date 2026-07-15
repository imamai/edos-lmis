-- EDOS LMIS Phase 1 — enums
-- Independent LMIS module. Tenancy/RBAC/audit identity comes from edoshms_*; everything
-- domain-specific to the lab is new and prefixed edoslmis_.

do $$ begin
  create type edoslmis_department_type as enum (
    'clinical_chemistry','haematology','microbiology','virology','parasitology',
    'immunology','histopathology','cytology','molecular_biology','pcr','blood_bank',
    'urinalysis','toxicology','serology','tb_laboratory','hiv_laboratory','covid',
    'research','other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_gender_applicability as enum ('all','male','female');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_gender as enum ('male','female','other','unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_patient_category as enum (
    'walk_in','inpatient','outpatient','corporate','insurance','referral','research'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_order_source as enum (
    'manual','emr','api','hl7','fhir','referral','bulk_import'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_order_priority as enum ('routine','urgent','stat');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_order_status as enum (
    'pending','accessioned','in_progress','partially_completed','completed','cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_order_test_status as enum (
    'pending','specimen_collected','received','in_analysis','resulted','verified',
    'released','cancelled','rejected'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_specimen_status as enum (
    'pending_collection','collected','in_transit','received','accessioned','rejected',
    'in_analysis','analyzed','disposed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_tracking_event as enum (
    'ordered','collected','received','rejected','accessioned','routed',
    'analysis_started','analysis_completed','verified','released','disposed'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_result_flag as enum (
    'normal','low','high','critical_low','critical_high','abnormal'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_verification_level as enum ('technologist','scientist','pathologist');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_verification_status as enum (
    'pending','verified','rejected_back_for_recollection'
  );
exception when duplicate_object then null; end $$;
-- EDOS LMIS Phase 1 — shared trigger fn, departments, specimen types, test catalog

create or replace function edoslmis_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Departments (lab sections)
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_departments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  branch_id uuid references edoshms_branches(id),
  code varchar(30) not null,
  name varchar(150) not null,
  department_type edoslmis_department_type not null default 'other',
  head_user_id uuid references edoshms_user_profiles(id),
  default_tat_hours integer,
  settings jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, code)
);
create index if not exists edoslmis_departments_tenant_idx on edoslmis_departments(tenant_id);
create index if not exists edoslmis_departments_branch_idx on edoslmis_departments(branch_id);
create trigger edoslmis_trg_departments_updated_at
  before update on edoslmis_departments
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Specimen types
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_specimen_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  code varchar(30) not null,
  name varchar(100) not null,
  default_container varchar(100),
  default_volume varchar(50),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);
create index if not exists edoslmis_specimen_types_tenant_idx on edoslmis_specimen_types(tenant_id);
create trigger edoslmis_trg_specimen_types_updated_at
  before update on edoslmis_specimen_types
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Test categories
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_test_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  department_id uuid references edoslmis_departments(id),
  name varchar(150) not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists edoslmis_test_categories_tenant_idx on edoslmis_test_categories(tenant_id);
create index if not exists edoslmis_test_categories_dept_idx on edoslmis_test_categories(department_id);
create trigger edoslmis_trg_test_categories_updated_at
  before update on edoslmis_test_categories
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Tests
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_tests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  department_id uuid references edoslmis_departments(id),
  category_id uuid references edoslmis_test_categories(id),
  specimen_type_id uuid references edoslmis_specimen_types(id),
  code varchar(30) not null,
  name varchar(200) not null,
  short_name varchar(60),
  methodology varchar(150),
  unit varchar(30),
  price numeric(12,2) not null default 0,
  turnaround_time_hours integer,
  gender_applicability edoslmis_gender_applicability not null default 'all',
  min_age_days integer,
  max_age_days integer,
  loinc_code varchar(20),
  icd_codes jsonb not null default '[]'::jsonb,
  cpt_code varchar(20),
  snomed_code varchar(20),
  critical_low numeric(14,4),
  critical_high numeric(14,4),
  preparation_instructions text,
  is_panel boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, code)
);
create index if not exists edoslmis_tests_tenant_idx on edoslmis_tests(tenant_id);
create index if not exists edoslmis_tests_dept_idx on edoslmis_tests(department_id);
create index if not exists edoslmis_tests_category_idx on edoslmis_tests(category_id);
create trigger edoslmis_trg_tests_updated_at
  before update on edoslmis_tests
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Test components (panel sub-parameters, e.g. FBC -> WBC, HGB, PLT ...)
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_test_components (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references edoslmis_tests(id) on delete cascade,
  name varchar(150) not null,
  sequence integer not null default 0,
  unit varchar(30),
  data_type varchar(20) not null default 'numeric', -- numeric | text | select
  critical_low numeric(14,4),
  critical_high numeric(14,4),
  select_options jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists edoslmis_test_components_test_idx on edoslmis_test_components(test_id);
create trigger edoslmis_trg_test_components_updated_at
  before update on edoslmis_test_components
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Reference ranges (age/gender specific, per test or per component)
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_reference_ranges (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references edoslmis_tests(id) on delete cascade,
  component_id uuid references edoslmis_test_components(id) on delete cascade,
  gender edoslmis_gender_applicability not null default 'all',
  age_min_days integer not null default 0,
  age_max_days integer,
  low numeric(14,4),
  high numeric(14,4),
  text_range varchar(200),
  critical_low numeric(14,4),
  critical_high numeric(14,4),
  condition_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists edoslmis_reference_ranges_test_idx on edoslmis_reference_ranges(test_id);
create index if not exists edoslmis_reference_ranges_component_idx on edoslmis_reference_ranges(component_id);
create trigger edoslmis_trg_reference_ranges_updated_at
  before update on edoslmis_reference_ranges
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Panels (bundles of tests, e.g. "U&E", "LFT")
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_panels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  department_id uuid references edoslmis_departments(id),
  code varchar(30) not null,
  name varchar(200) not null,
  price numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);
create index if not exists edoslmis_panels_tenant_idx on edoslmis_panels(tenant_id);
create trigger edoslmis_trg_panels_updated_at
  before update on edoslmis_panels
  for each row execute function edoslmis_set_updated_at();

create table if not exists edoslmis_panel_tests (
  id uuid primary key default gen_random_uuid(),
  panel_id uuid not null references edoslmis_panels(id) on delete cascade,
  test_id uuid not null references edoslmis_tests(id) on delete cascade,
  sequence integer not null default 0,
  unique (panel_id, test_id)
);
create index if not exists edoslmis_panel_tests_panel_idx on edoslmis_panel_tests(panel_id);
create index if not exists edoslmis_panel_tests_test_idx on edoslmis_panel_tests(test_id);
-- EDOS LMIS Phase 1 — patients (standalone, independent of edoshms_patients)

create table if not exists edoslmis_patients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  branch_id uuid references edoshms_branches(id),
  patient_number varchar(40) not null,
  national_id varchar(30),
  passport_number varchar(30),
  alien_id varchar(30),
  sha_number varchar(30),
  nhif_number varchar(30),
  first_name varchar(100) not null,
  last_name varchar(100) not null,
  other_names varchar(150),
  gender edoslmis_gender,
  date_of_birth date,
  age_years integer,
  age_months integer,
  phone_primary varchar(30),
  phone_secondary varchar(30),
  email varchar(150),
  county varchar(100),
  sub_county varchar(100),
  ward varchar(100),
  village varchar(150),
  address text,
  patient_category edoslmis_patient_category not null default 'walk_in',
  insurance_info jsonb not null default '{}'::jsonb,
  next_of_kin_name varchar(150),
  next_of_kin_phone varchar(30),
  next_of_kin_relationship varchar(60),
  referring_facility varchar(150),
  referring_doctor varchar(150),
  notes text,
  registered_by uuid references edoshms_user_profiles(id),
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, patient_number)
);
create index if not exists edoslmis_patients_tenant_idx on edoslmis_patients(tenant_id);
create index if not exists edoslmis_patients_branch_idx on edoslmis_patients(branch_id);
create index if not exists edoslmis_patients_national_id_idx on edoslmis_patients(national_id);
create index if not exists edoslmis_patients_name_idx on edoslmis_patients(last_name, first_name);
create index if not exists edoslmis_patients_phone_idx on edoslmis_patients(phone_primary);
create trigger edoslmis_trg_patients_updated_at
  before update on edoslmis_patients
  for each row execute function edoslmis_set_updated_at();

-- Sequence-backed friendly patient number generator, per tenant.
create sequence if not exists edoslmis_patient_number_seq;

create or replace function edoslmis_generate_patient_number()
returns text
language sql
as $$
  select 'LMP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('edoslmis_patient_number_seq')::text, 6, '0');
$$;
-- EDOS LMIS Phase 1 — orders, order line items, specimens, chain-of-custody tracking

create sequence if not exists edoslmis_order_number_seq;
create or replace function edoslmis_generate_order_number()
returns text
language sql
as $$
  select 'LMO-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('edoslmis_order_number_seq')::text, 5, '0');
$$;

create sequence if not exists edoslmis_specimen_number_seq;
create or replace function edoslmis_generate_specimen_number()
returns text
language sql
as $$
  select 'LMS-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('edoslmis_specimen_number_seq')::text, 6, '0');
$$;

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  branch_id uuid references edoshms_branches(id),
  order_number varchar(40) not null,
  patient_id uuid not null references edoslmis_patients(id),
  ordering_clinician varchar(150),
  ordering_user_id uuid references edoshms_user_profiles(id),
  order_source edoslmis_order_source not null default 'manual',
  priority edoslmis_order_priority not null default 'routine',
  status edoslmis_order_status not null default 'pending',
  clinical_indication text,
  ordered_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancellation_reason text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, order_number)
);
create index if not exists edoslmis_orders_tenant_idx on edoslmis_orders(tenant_id);
create index if not exists edoslmis_orders_branch_idx on edoslmis_orders(branch_id);
create index if not exists edoslmis_orders_patient_idx on edoslmis_orders(patient_id);
create index if not exists edoslmis_orders_status_idx on edoslmis_orders(status);
create trigger edoslmis_trg_orders_updated_at
  before update on edoslmis_orders
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Order line items (one per test; panels expand into their member tests)
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_order_tests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  order_id uuid not null references edoslmis_orders(id) on delete cascade,
  test_id uuid not null references edoslmis_tests(id),
  panel_id uuid references edoslmis_panels(id),
  department_id uuid references edoslmis_departments(id),
  specimen_id uuid,
  price numeric(12,2) not null default 0,
  status edoslmis_order_test_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists edoslmis_order_tests_tenant_idx on edoslmis_order_tests(tenant_id);
create index if not exists edoslmis_order_tests_order_idx on edoslmis_order_tests(order_id);
create index if not exists edoslmis_order_tests_test_idx on edoslmis_order_tests(test_id);
create index if not exists edoslmis_order_tests_dept_idx on edoslmis_order_tests(department_id);
create index if not exists edoslmis_order_tests_specimen_idx on edoslmis_order_tests(specimen_id);
create index if not exists edoslmis_order_tests_status_idx on edoslmis_order_tests(status);
create trigger edoslmis_trg_order_tests_updated_at
  before update on edoslmis_order_tests
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Specimens
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_specimens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  branch_id uuid references edoshms_branches(id),
  order_id uuid not null references edoslmis_orders(id) on delete cascade,
  specimen_number varchar(40) not null,
  specimen_type_id uuid references edoslmis_specimen_types(id),
  barcode_symbology varchar(20) not null default 'CODE128',
  qr_payload text,
  status edoslmis_specimen_status not null default 'pending_collection',
  collected_at timestamptz,
  collected_by uuid references edoshms_user_profiles(id),
  received_at timestamptz,
  received_by uuid references edoshms_user_profiles(id),
  condition_on_receipt varchar(100),
  rejection_reason text,
  rejected_at timestamptz,
  rejected_by uuid references edoshms_user_profiles(id),
  storage_location varchar(100),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, specimen_number)
);
create index if not exists edoslmis_specimens_tenant_idx on edoslmis_specimens(tenant_id);
create index if not exists edoslmis_specimens_branch_idx on edoslmis_specimens(branch_id);
create index if not exists edoslmis_specimens_order_idx on edoslmis_specimens(order_id);
create index if not exists edoslmis_specimens_status_idx on edoslmis_specimens(status);
create trigger edoslmis_trg_specimens_updated_at
  before update on edoslmis_specimens
  for each row execute function edoslmis_set_updated_at();

alter table edoslmis_order_tests
  add constraint edoslmis_order_tests_specimen_fkey
  foreign key (specimen_id) references edoslmis_specimens(id);

-- ---------------------------------------------------------------------------
-- Specimen chain-of-custody tracking
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_specimen_tracking (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  specimen_id uuid not null references edoslmis_specimens(id) on delete cascade,
  event_type edoslmis_tracking_event not null,
  event_at timestamptz not null default now(),
  actor_user_id uuid references edoshms_user_profiles(id),
  location varchar(150),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists edoslmis_specimen_tracking_tenant_idx on edoslmis_specimen_tracking(tenant_id);
create index if not exists edoslmis_specimen_tracking_specimen_idx on edoslmis_specimen_tracking(specimen_id);
-- EDOS LMIS Phase 1 — result entry, two-step verification, release, critical alerts

create table if not exists edoslmis_result_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  order_test_id uuid not null references edoslmis_order_tests(id) on delete cascade,
  component_id uuid references edoslmis_test_components(id),
  result_value_text text,
  result_value_numeric numeric(14,4),
  unit varchar(30),
  flag edoslmis_result_flag,
  is_critical boolean not null default false,
  delta_check_flag boolean not null default false,
  previous_result_id uuid references edoslmis_result_entries(id),
  comments text,
  entered_by uuid references edoshms_user_profiles(id),
  entered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists edoslmis_result_entries_tenant_idx on edoslmis_result_entries(tenant_id);
create index if not exists edoslmis_result_entries_order_test_idx on edoslmis_result_entries(order_test_id);
create index if not exists edoslmis_result_entries_component_idx on edoslmis_result_entries(component_id);
create trigger edoslmis_trg_result_entries_updated_at
  before update on edoslmis_result_entries
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Two-step verification: technologist -> scientist/pathologist
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_result_verification (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  order_test_id uuid not null references edoslmis_order_tests(id) on delete cascade,
  level edoslmis_verification_level not null,
  status edoslmis_verification_status not null default 'pending',
  verified_by uuid references edoshms_user_profiles(id),
  verified_at timestamptz,
  signature_hash text,
  comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists edoslmis_result_verification_tenant_idx on edoslmis_result_verification(tenant_id);
create index if not exists edoslmis_result_verification_order_test_idx on edoslmis_result_verification(order_test_id);
create trigger edoslmis_trg_result_verification_updated_at
  before update on edoslmis_result_verification
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Release
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_result_release (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  order_test_id uuid not null references edoslmis_order_tests(id) on delete cascade,
  released_by uuid references edoshms_user_profiles(id),
  released_at timestamptz not null default now(),
  release_channels jsonb not null default '{}'::jsonb, -- {printed, sms, email, portal}
  printed_at timestamptz,
  sms_sent_at timestamptz,
  email_sent_at timestamptz,
  portal_published_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists edoslmis_result_release_tenant_idx on edoslmis_result_release(tenant_id);
create index if not exists edoslmis_result_release_order_test_idx on edoslmis_result_release(order_test_id);

-- ---------------------------------------------------------------------------
-- Critical value alerts / acknowledgement
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_critical_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  result_entry_id uuid not null references edoslmis_result_entries(id) on delete cascade,
  notified_to uuid references edoshms_user_profiles(id),
  notified_at timestamptz not null default now(),
  acknowledged_by uuid references edoshms_user_profiles(id),
  acknowledged_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists edoslmis_critical_alerts_tenant_idx on edoslmis_critical_alerts(tenant_id);
create index if not exists edoslmis_critical_alerts_result_idx on edoslmis_critical_alerts(result_entry_id);

-- ---------------------------------------------------------------------------
-- Audit log (independent of edoshms_audit_logs)
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references edoshms_tenants(id),
  branch_id uuid references edoshms_branches(id),
  user_id uuid references edoshms_user_profiles(id),
  action varchar(20) not null,
  table_name varchar(100) not null,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz not null default now()
);
create index if not exists edoslmis_audit_logs_tenant_idx on edoslmis_audit_logs(tenant_id);
create index if not exists edoslmis_audit_logs_table_record_idx on edoslmis_audit_logs(table_name, record_id);
create index if not exists edoslmis_audit_logs_created_idx on edoslmis_audit_logs(created_at);

create or replace function edoslmis_write_audit_log()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tenant_id uuid;
begin
  v_tenant_id := coalesce(
    case when TG_OP = 'DELETE' then (to_jsonb(old)->>'tenant_id')::uuid
         else (to_jsonb(new)->>'tenant_id')::uuid end,
    edoshms_get_tenant_id()
  );

  insert into edoslmis_audit_logs (tenant_id, branch_id, user_id, action, table_name, record_id, old_values, new_values)
  values (
    v_tenant_id,
    edoshms_get_branch_id(),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    case when TG_OP = 'DELETE' then (to_jsonb(old)->>'id')::uuid else (to_jsonb(new)->>'id')::uuid end,
    case when TG_OP in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('INSERT','UPDATE') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$;

create trigger edoslmis_trg_audit_orders
  after insert or update or delete on edoslmis_orders
  for each row execute function edoslmis_write_audit_log();

create trigger edoslmis_trg_audit_specimens
  after insert or update or delete on edoslmis_specimens
  for each row execute function edoslmis_write_audit_log();

create trigger edoslmis_trg_audit_result_entries
  after insert or update or delete on edoslmis_result_entries
  for each row execute function edoslmis_write_audit_log();

create trigger edoslmis_trg_audit_result_verification
  after insert or update or delete on edoslmis_result_verification
  for each row execute function edoslmis_write_audit_log();

create trigger edoslmis_trg_audit_result_release
  after insert or update or delete on edoslmis_result_release
  for each row execute function edoslmis_write_audit_log();
-- EDOS LMIS Phase 1 — permission helper + RLS policies
-- Tenancy/role identity resolved via existing edoshms_* helper functions:
--   edoshms_get_tenant_id(), edoshms_get_branch_id(),
--   edoshms_is_platform_admin(), edoshms_is_tenant_admin(uuid)

create or replace function edoslmis_has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(edoshms_is_platform_admin(), false)
    or exists (
      select 1
      from edoshms_user_roles ur
      join edoshms_roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and (ur.expires_at is null or ur.expires_at > now())
        and r.is_active = true
        and r.permissions ? p_permission
    );
$$;

create or replace function edoslmis_is_admin_for(p_tenant_id uuid)
returns boolean
language sql
stable
as $$
  select coalesce(edoshms_is_platform_admin(), false)
    or coalesce(edoshms_is_tenant_admin(p_tenant_id), false);
$$;

-- ---------------------------------------------------------------------------
-- Catalog tables: tenant-scoped read for all tenant staff, write requires
-- edoslmis.catalog.manage or tenant/platform admin.
-- ---------------------------------------------------------------------------
alter table edoslmis_departments enable row level security;
create policy edoslmis_departments_select on edoslmis_departments
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_departments_write on edoslmis_departments
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_specimen_types enable row level security;
create policy edoslmis_specimen_types_select on edoslmis_specimen_types
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_specimen_types_write on edoslmis_specimen_types
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_test_categories enable row level security;
create policy edoslmis_test_categories_select on edoslmis_test_categories
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_test_categories_write on edoslmis_test_categories
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_tests enable row level security;
create policy edoslmis_tests_select on edoslmis_tests
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_tests_write on edoslmis_tests
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_test_components enable row level security;
create policy edoslmis_test_components_select on edoslmis_test_components
  for select using (
    exists (select 1 from edoslmis_tests t where t.id = test_id
      and (t.tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin()))
  );
create policy edoslmis_test_components_write on edoslmis_test_components
  for all using (
    exists (select 1 from edoslmis_tests t where t.id = test_id and t.tenant_id = edoshms_get_tenant_id()
      and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(t.tenant_id)))
  ) with check (
    exists (select 1 from edoslmis_tests t where t.id = test_id and t.tenant_id = edoshms_get_tenant_id()
      and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(t.tenant_id)))
  );

alter table edoslmis_reference_ranges enable row level security;
create policy edoslmis_reference_ranges_select on edoslmis_reference_ranges
  for select using (
    exists (select 1 from edoslmis_tests t where t.id = test_id
      and (t.tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin()))
  );
create policy edoslmis_reference_ranges_write on edoslmis_reference_ranges
  for all using (
    exists (select 1 from edoslmis_tests t where t.id = test_id and t.tenant_id = edoshms_get_tenant_id()
      and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(t.tenant_id)))
  ) with check (
    exists (select 1 from edoslmis_tests t where t.id = test_id and t.tenant_id = edoshms_get_tenant_id()
      and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(t.tenant_id)))
  );

alter table edoslmis_panels enable row level security;
create policy edoslmis_panels_select on edoslmis_panels
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_panels_write on edoslmis_panels
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_panel_tests enable row level security;
create policy edoslmis_panel_tests_select on edoslmis_panel_tests
  for select using (
    exists (select 1 from edoslmis_panels p where p.id = panel_id
      and (p.tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin()))
  );
create policy edoslmis_panel_tests_write on edoslmis_panel_tests
  for all using (
    exists (select 1 from edoslmis_panels p where p.id = panel_id and p.tenant_id = edoshms_get_tenant_id()
      and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(p.tenant_id)))
  ) with check (
    exists (select 1 from edoslmis_panels p where p.id = panel_id and p.tenant_id = edoshms_get_tenant_id()
      and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_is_admin_for(p.tenant_id)))
  );

-- ---------------------------------------------------------------------------
-- Patients: tenant + branch scoped. Any authenticated tenant staff member with
-- 'edoslmis.patient.manage' can register/edit; everyone in-tenant can read.
-- ---------------------------------------------------------------------------
alter table edoslmis_patients enable row level security;
create policy edoslmis_patients_select on edoslmis_patients
  for select using (
    tenant_id = edoshms_get_tenant_id()
    and (branch_id is null or branch_id = edoshms_get_branch_id() or edoslmis_is_admin_for(tenant_id))
    or edoshms_is_platform_admin()
  );
create policy edoslmis_patients_write on edoslmis_patients
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.patient.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.patient.manage') or edoslmis_is_admin_for(tenant_id))
  );

-- ---------------------------------------------------------------------------
-- Orders / order tests
-- ---------------------------------------------------------------------------
alter table edoslmis_orders enable row level security;
create policy edoslmis_orders_select on edoslmis_orders
  for select using (
    (tenant_id = edoshms_get_tenant_id()
      and (branch_id is null or branch_id = edoshms_get_branch_id() or edoslmis_is_admin_for(tenant_id)))
    or edoshms_is_platform_admin()
  );
create policy edoslmis_orders_write on edoslmis_orders
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.order.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.order.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_order_tests enable row level security;
create policy edoslmis_order_tests_select on edoslmis_order_tests
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_order_tests_write on edoslmis_order_tests
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.order.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.order.manage') or edoslmis_is_admin_for(tenant_id))
  );

-- ---------------------------------------------------------------------------
-- Specimens / tracking
-- ---------------------------------------------------------------------------
alter table edoslmis_specimens enable row level security;
create policy edoslmis_specimens_select on edoslmis_specimens
  for select using (
    (tenant_id = edoshms_get_tenant_id()
      and (branch_id is null or branch_id = edoshms_get_branch_id() or edoslmis_is_admin_for(tenant_id)))
    or edoshms_is_platform_admin()
  );
create policy edoslmis_specimens_write on edoslmis_specimens
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.specimen.collect') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.specimen.collect') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_specimen_tracking enable row level security;
create policy edoslmis_specimen_tracking_select on edoslmis_specimen_tracking
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_specimen_tracking_insert on edoslmis_specimen_tracking
  for insert with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.specimen.collect') or edoslmis_is_admin_for(tenant_id))
  );

-- ---------------------------------------------------------------------------
-- Results / verification / release / critical alerts
-- ---------------------------------------------------------------------------
alter table edoslmis_result_entries enable row level security;
create policy edoslmis_result_entries_select on edoslmis_result_entries
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_result_entries_write on edoslmis_result_entries
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_result_verification enable row level security;
create policy edoslmis_result_verification_select on edoslmis_result_verification
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_result_verification_write on edoslmis_result_verification
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.verify') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.verify') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_result_release enable row level security;
create policy edoslmis_result_release_select on edoslmis_result_release
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_result_release_insert on edoslmis_result_release
  for insert with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.release') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_critical_alerts enable row level security;
create policy edoslmis_critical_alerts_select on edoslmis_critical_alerts
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_critical_alerts_write on edoslmis_critical_alerts
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_has_permission('edoslmis.critical.acknowledge') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_has_permission('edoslmis.critical.acknowledge') or edoslmis_is_admin_for(tenant_id))
  );

-- ---------------------------------------------------------------------------
-- Audit log: read-only to tenant/platform admins; writes only via the
-- security-definer trigger function (which bypasses RLS).
-- ---------------------------------------------------------------------------
alter table edoslmis_audit_logs enable row level security;
create policy edoslmis_audit_logs_select on edoslmis_audit_logs
  for select using (
    edoshms_is_platform_admin()
    or (tenant_id = edoshms_get_tenant_id() and edoslmis_is_admin_for(tenant_id))
  );
-- EDOS LMIS Phase 1 — seed data for tenant "EdosCentre Medical"
-- tenant_id 5149e80b-d5a9-4bfa-a1ac-8508c8898c87, branch_id (Main Branch) f201bc43-ea2c-48e1-86ba-6f11ffce76b0

-- ---------------------------------------------------------------------------
-- Lab roles (edoshms_roles is currently empty across the whole DB)
-- ---------------------------------------------------------------------------
insert into edoshms_roles (tenant_id, code, name, description, permissions, is_system, is_active)
values
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'lab_phlebotomist', 'Phlebotomist',
   'Collects specimens', '["edoslmis.order.manage","edoslmis.specimen.collect"]'::jsonb, false, true),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'lab_technologist', 'Lab Technologist',
   'Accessions specimens and enters results', '["edoslmis.order.manage","edoslmis.specimen.collect","edoslmis.result.enter"]'::jsonb, false, true),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'lab_scientist', 'Laboratory Scientist',
   'First-level result verification', '["edoslmis.order.manage","edoslmis.result.enter","edoslmis.result.verify","edoslmis.critical.acknowledge"]'::jsonb, false, true),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'pathologist', 'Pathologist',
   'Final verification and release', '["edoslmis.result.verify","edoslmis.result.release","edoslmis.critical.acknowledge"]'::jsonb, false, true),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'lab_manager', 'Laboratory Manager',
   'Manages catalogue, departments and staff', '["edoslmis.catalog.manage","edoslmis.patient.manage","edoslmis.order.manage","edoslmis.specimen.collect","edoslmis.result.enter","edoslmis.result.verify","edoslmis.result.release","edoslmis.critical.acknowledge"]'::jsonb, false, true)
on conflict do nothing;

-- Assign two existing staff members lab roles so the two-step verification
-- flow (technologist -> scientist) can be exercised end to end.
insert into edoshms_user_roles (tenant_id, user_id, role_id, branch_id, is_active)
select '5149e80b-d5a9-4bfa-a1ac-8508c8898c87', '8b02234d-9b0d-40b2-b72d-b56c21af7ad7',
       r.id, 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', true
from edoshms_roles r where r.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and r.code = 'lab_technologist'
on conflict do nothing;

insert into edoshms_user_roles (tenant_id, user_id, role_id, branch_id, is_active)
select '5149e80b-d5a9-4bfa-a1ac-8508c8898c87', '2f3275b4-08fc-41cd-9213-0365d401429c',
       r.id, 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', true
from edoshms_roles r where r.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and r.code = 'lab_scientist'
on conflict do nothing;

insert into edoshms_user_roles (tenant_id, user_id, role_id, branch_id, is_active)
select '5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f02b1786-7a40-47e2-bec4-c59560b93824',
       r.id, 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', true
from edoshms_roles r where r.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and r.code = 'pathologist'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Departments
-- ---------------------------------------------------------------------------
insert into edoslmis_departments (tenant_id, branch_id, code, name, department_type, default_tat_hours)
values
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', 'CHEM', 'Clinical Chemistry', 'clinical_chemistry', 6),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', 'HAEM', 'Haematology', 'haematology', 4),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', 'MICRO', 'Microbiology', 'microbiology', 72),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', 'PARA', 'Parasitology', 'parasitology', 2),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', 'SERO', 'Serology & Immunology', 'immunology', 24),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', 'BB', 'Blood Bank', 'blood_bank', 2),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', 'URINE', 'Urinalysis', 'urinalysis', 2),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', 'MOLBIO', 'Molecular Biology / PCR', 'molecular_biology', 48),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', 'HISTO', 'Histopathology', 'histopathology', 120)
on conflict (tenant_id, code) do nothing;

-- ---------------------------------------------------------------------------
-- Specimen types
-- ---------------------------------------------------------------------------
insert into edoslmis_specimen_types (tenant_id, code, name, default_container)
values
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'WB_EDTA', 'Whole Blood (EDTA)', 'Purple-top EDTA tube'),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'SERUM', 'Serum', 'Red/Gold-top SST tube'),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'PLASMA', 'Plasma (Citrate)', 'Blue-top citrate tube'),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'URINE', 'Urine', 'Sterile urine container'),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'STOOL', 'Stool', 'Stool container'),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'SPUTUM', 'Sputum', 'Sputum container'),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'CSF', 'Cerebrospinal Fluid', 'Sterile CSF tube'),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'SWAB', 'Swab', 'Sterile swab with transport medium'),
  ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'WB_NOADD', 'Whole Blood (no additive)', 'Plain tube')
on conflict (tenant_id, code) do nothing;

-- ---------------------------------------------------------------------------
-- Tests + panels (representative Kenyan lab menu)
-- ---------------------------------------------------------------------------

-- Full Haemogram / FBC (panel with components)
insert into edoslmis_tests (tenant_id, department_id, specimen_type_id, code, name, short_name, price, turnaround_time_hours, is_panel, methodology)
select '5149e80b-d5a9-4bfa-a1ac-8508c8898c87', d.id, st.id, 'FBC', 'Full Haemogram (FBC)', 'FBC', 800, 4, true, 'Automated haematology analyzer'
from edoslmis_departments d, edoslmis_specimen_types st
where d.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and d.code = 'HAEM'
  and st.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and st.code = 'WB_EDTA'
on conflict (tenant_id, code) do nothing;

insert into edoslmis_test_components (test_id, name, sequence, unit)
select t.id, comp.name, comp.seq, comp.unit
from edoslmis_tests t
cross join (values
  ('White Blood Cells (WBC)', 1, '10^9/L'),
  ('Red Blood Cells (RBC)', 2, '10^12/L'),
  ('Haemoglobin (HGB)', 3, 'g/dL'),
  ('Haematocrit (HCT)', 4, '%'),
  ('Platelets (PLT)', 5, '10^9/L'),
  ('MCV', 6, 'fL'),
  ('MCH', 7, 'pg'),
  ('MCHC', 8, 'g/dL')
) as comp(name, seq, unit)
where t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = 'FBC'
  and not exists (select 1 from edoslmis_test_components tc where tc.test_id = t.id and tc.name = comp.name);

-- Reference ranges for HGB (gender specific) and WBC/PLT (generic)
insert into edoslmis_reference_ranges (test_id, component_id, gender, age_min_days, low, high, critical_low, critical_high)
select t.id, tc.id, 'male', 6570, 13.5, 17.5, 6.5, 20
from edoslmis_tests t join edoslmis_test_components tc on tc.test_id = t.id and tc.name = 'Haemoglobin (HGB)'
where t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = 'FBC';

insert into edoslmis_reference_ranges (test_id, component_id, gender, age_min_days, low, high, critical_low, critical_high)
select t.id, tc.id, 'female', 6570, 12.0, 15.5, 6.5, 20
from edoslmis_tests t join edoslmis_test_components tc on tc.test_id = t.id and tc.name = 'Haemoglobin (HGB)'
where t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = 'FBC';

insert into edoslmis_reference_ranges (test_id, component_id, gender, age_min_days, low, high, critical_low, critical_high)
select t.id, tc.id, 'all', 0, 4.0, 11.0, 2.0, 30.0
from edoslmis_tests t join edoslmis_test_components tc on tc.test_id = t.id and tc.name = 'White Blood Cells (WBC)'
where t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = 'FBC';

insert into edoslmis_reference_ranges (test_id, component_id, gender, age_min_days, low, high, critical_low, critical_high)
select t.id, tc.id, 'all', 0, 150, 450, 20, 1000
from edoslmis_tests t join edoslmis_test_components tc on tc.test_id = t.id and tc.name = 'Platelets (PLT)'
where t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = 'FBC';

-- Renal / U&E&Cr panel
insert into edoslmis_tests (tenant_id, department_id, specimen_type_id, code, name, short_name, price, turnaround_time_hours, is_panel, methodology)
select '5149e80b-d5a9-4bfa-a1ac-8508c8898c87', d.id, st.id, 'UECR', 'Urea, Electrolytes & Creatinine', 'U&E&Cr', 1200, 6, true, 'Ion-selective electrode / colorimetric'
from edoslmis_departments d, edoslmis_specimen_types st
where d.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and d.code = 'CHEM'
  and st.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and st.code = 'SERUM'
on conflict (tenant_id, code) do nothing;

insert into edoslmis_test_components (test_id, name, sequence, unit)
select t.id, comp.name, comp.seq, comp.unit
from edoslmis_tests t
cross join (values
  ('Sodium', 1, 'mmol/L'), ('Potassium', 2, 'mmol/L'), ('Chloride', 3, 'mmol/L'),
  ('Urea', 4, 'mmol/L'), ('Creatinine', 5, 'umol/L')
) as comp(name, seq, unit)
where t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = 'UECR'
  and not exists (select 1 from edoslmis_test_components tc where tc.test_id = t.id and tc.name = comp.name);

insert into edoslmis_reference_ranges (test_id, component_id, gender, age_min_days, low, high, critical_low, critical_high)
select t.id, tc.id, 'all', 0, 135, 145, 120, 160
from edoslmis_tests t join edoslmis_test_components tc on tc.test_id = t.id and tc.name = 'Sodium'
where t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = 'UECR';

insert into edoslmis_reference_ranges (test_id, component_id, gender, age_min_days, low, high, critical_low, critical_high)
select t.id, tc.id, 'all', 0, 3.5, 5.1, 2.5, 6.5
from edoslmis_tests t join edoslmis_test_components tc on tc.test_id = t.id and tc.name = 'Potassium'
where t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = 'UECR';

insert into edoslmis_reference_ranges (test_id, component_id, gender, age_min_days, low, high)
select t.id, tc.id, 'all', 0, 53, 97
from edoslmis_tests t join edoslmis_test_components tc on tc.test_id = t.id and tc.name = 'Creatinine'
where t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = 'UECR';

-- Liver function tests panel
insert into edoslmis_tests (tenant_id, department_id, specimen_type_id, code, name, short_name, price, turnaround_time_hours, is_panel, methodology)
select '5149e80b-d5a9-4bfa-a1ac-8508c8898c87', d.id, st.id, 'LFT', 'Liver Function Tests', 'LFT', 1500, 6, true, 'Colorimetric / enzymatic'
from edoslmis_departments d, edoslmis_specimen_types st
where d.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and d.code = 'CHEM'
  and st.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and st.code = 'SERUM'
on conflict (tenant_id, code) do nothing;

insert into edoslmis_test_components (test_id, name, sequence, unit)
select t.id, comp.name, comp.seq, comp.unit
from edoslmis_tests t
cross join (values
  ('ALT', 1, 'U/L'), ('AST', 2, 'U/L'), ('ALP', 3, 'U/L'),
  ('Total Bilirubin', 4, 'umol/L'), ('Direct Bilirubin', 5, 'umol/L'), ('Total Protein', 6, 'g/L'), ('Albumin', 7, 'g/L')
) as comp(name, seq, unit)
where t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = 'LFT'
  and not exists (select 1 from edoslmis_test_components tc where tc.test_id = t.id and tc.name = comp.name);

-- Lipid profile panel
insert into edoslmis_tests (tenant_id, department_id, specimen_type_id, code, name, short_name, price, turnaround_time_hours, is_panel, methodology)
select '5149e80b-d5a9-4bfa-a1ac-8508c8898c87', d.id, st.id, 'LIPID', 'Lipid Profile', 'Lipids', 1300, 6, true, 'Enzymatic colorimetric'
from edoslmis_departments d, edoslmis_specimen_types st
where d.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and d.code = 'CHEM'
  and st.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and st.code = 'SERUM'
on conflict (tenant_id, code) do nothing;

insert into edoslmis_test_components (test_id, name, sequence, unit)
select t.id, comp.name, comp.seq, comp.unit
from edoslmis_tests t
cross join (values
  ('Total Cholesterol', 1, 'mmol/L'), ('HDL Cholesterol', 2, 'mmol/L'),
  ('LDL Cholesterol', 3, 'mmol/L'), ('Triglycerides', 4, 'mmol/L')
) as comp(name, seq, unit)
where t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = 'LIPID'
  and not exists (select 1 from edoslmis_test_components tc where tc.test_id = t.id and tc.name = comp.name);

-- Single-parameter tests
insert into edoslmis_tests (tenant_id, department_id, specimen_type_id, code, name, short_name, unit, price, turnaround_time_hours, is_panel, methodology, critical_low, critical_high)
select '5149e80b-d5a9-4bfa-a1ac-8508c8898c87', d.id, st.id, v.code, v.name, v.short_name, v.unit, v.price, v.tat, false, v.method, v.crit_low, v.crit_high
from (values
  ('CHEM', 'SERUM', 'RBS', 'Random Blood Sugar', 'RBS', 'mmol/L', 200, 1, 'Glucose oxidase', 2.2, 22.0),
  ('CHEM', 'SERUM', 'HBA1C', 'Glycated Haemoglobin (HbA1c)', 'HbA1c', '%', 1500, 24, 'HPLC', null, null),
  ('CHEM', 'SERUM', 'TSH', 'Thyroid Stimulating Hormone', 'TSH', 'mIU/L', 1800, 24, 'Immunoassay (CLIA)', null, null),
  ('PARA', 'WB_EDTA', 'MALBS', 'Malaria Blood Slide (BS)', 'Mal BS', null, 300, 2, 'Microscopy', null, null),
  ('PARA', 'WB_EDTA', 'MALRDT', 'Malaria Rapid Diagnostic Test', 'Mal RDT', null, 250, 1, 'Rapid immunochromatography', null, null),
  ('SERO', 'SERUM', 'HIVRT', 'HIV Rapid Test', 'HIV RT', null, 500, 1, 'Rapid immunochromatography', null, null),
  ('SERO', 'SERUM', 'WIDAL', 'Widal Test', 'Widal', null, 600, 4, 'Slide agglutination', null, null),
  ('SERO', 'SERUM', 'VDRL', 'VDRL / RPR (Syphilis)', 'VDRL', null, 500, 4, 'Flocculation', null, null),
  ('SERO', 'SERUM', 'HBSAG', 'Hepatitis B Surface Antigen', 'HBsAg', null, 700, 4, 'Rapid immunochromatography', null, null),
  ('SERO', 'SERUM', 'CRP', 'C-Reactive Protein', 'CRP', 'mg/L', 900, 6, 'Turbidimetric', null, 100),
  ('HAEM', 'WB_NOADD', 'ESR', 'Erythrocyte Sedimentation Rate', 'ESR', 'mm/hr', 300, 2, 'Westergren', null, null),
  ('BB', 'WB_EDTA', 'BGRP', 'Blood Group & Rh Factor', 'Blood Group', null, 500, 2, 'Slide/tube agglutination', null, null),
  ('URINE', 'URINE', 'URINA', 'Urinalysis (Dipstick + Microscopy)', 'Urinalysis', null, 400, 2, 'Dipstick + microscopy', null, null),
  ('MICRO', 'STOOL', 'STOOLMCS', 'Stool Microscopy, Culture & Sensitivity', 'Stool M/C/S', null, 900, 72, 'Culture', null, null),
  ('MOLBIO', 'SWAB', 'COVIDPCR', 'SARS-CoV-2 RT-PCR', 'COVID PCR', null, 3500, 24, 'Real-time RT-PCR', null, null)
) as v(dept_code, spec_code, code, name, short_name, unit, price, tat, method, crit_low, crit_high)
join edoslmis_departments d on d.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and d.code = v.dept_code
join edoslmis_specimen_types st on st.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and st.code = v.spec_code
on conflict (tenant_id, code) do nothing;
