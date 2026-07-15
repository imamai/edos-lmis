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
