-- EDOS LMIS Phase 3 — microbiology (culture & sensitivity) + molecular/PCR workflow
-- Both link to edoslmis_order_tests so finalized results feed the existing
-- verify -> release pipeline via edoslmis_result_entries, rather than
-- duplicating verification/release logic.

do $$ begin
  create type edoslmis_culture_type as enum ('aerobic','anaerobic','fungal','afb','blood_culture');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_culture_status as enum ('pending','growth','no_growth','contaminated','finalized');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_gram_stain as enum ('positive','negative','variable','not_applicable');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_isolate_significance as enum ('pathogen','contaminant','normal_flora');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_sensitivity_interpretation as enum ('susceptible','intermediate','resistant');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_molecular_run_status as enum ('pending','completed','invalid','repeat_required');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_molecular_result as enum ('detected','not_detected','indeterminate');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Organism & antibiotic catalogs
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_micro_organisms (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  name varchar(200) not null,
  gram_stain edoslmis_gram_stain not null default 'not_applicable',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);
create index if not exists edoslmis_micro_organisms_tenant_idx on edoslmis_micro_organisms(tenant_id);

create table if not exists edoslmis_micro_antibiotics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  name varchar(150) not null,
  antibiotic_class varchar(100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);
create index if not exists edoslmis_micro_antibiotics_tenant_idx on edoslmis_micro_antibiotics(tenant_id);

-- ---------------------------------------------------------------------------
-- Cultures
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_micro_cultures (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  branch_id uuid references edoshms_branches(id),
  order_test_id uuid not null references edoslmis_order_tests(id) on delete cascade,
  specimen_id uuid references edoslmis_specimens(id),
  culture_type edoslmis_culture_type not null default 'aerobic',
  media_used varchar(200),
  set_up_at timestamptz not null default now(),
  status edoslmis_culture_status not null default 'pending',
  gram_stain_result text,
  preliminary_report text,
  finalized_by uuid references edoshms_user_profiles(id),
  finalized_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists edoslmis_micro_cultures_tenant_idx on edoslmis_micro_cultures(tenant_id);
create index if not exists edoslmis_micro_cultures_order_test_idx on edoslmis_micro_cultures(order_test_id);
create index if not exists edoslmis_micro_cultures_status_idx on edoslmis_micro_cultures(status);
create trigger edoslmis_trg_micro_cultures_updated_at
  before update on edoslmis_micro_cultures
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Isolates (organisms grown from a culture)
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_micro_culture_isolates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  culture_id uuid not null references edoslmis_micro_cultures(id) on delete cascade,
  organism_id uuid not null references edoslmis_micro_organisms(id),
  colony_count varchar(100),
  significance edoslmis_isolate_significance not null default 'pathogen',
  created_at timestamptz not null default now()
);
create index if not exists edoslmis_micro_culture_isolates_tenant_idx on edoslmis_micro_culture_isolates(tenant_id);
create index if not exists edoslmis_micro_culture_isolates_culture_idx on edoslmis_micro_culture_isolates(culture_id);

-- ---------------------------------------------------------------------------
-- Antibiotic sensitivity testing (AST) results per isolate
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_micro_sensitivity_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  isolate_id uuid not null references edoslmis_micro_culture_isolates(id) on delete cascade,
  antibiotic_id uuid not null references edoslmis_micro_antibiotics(id),
  method varchar(60) not null default 'disc_diffusion',
  zone_diameter_mm numeric(6,2),
  mic_value numeric(10,4),
  interpretation edoslmis_sensitivity_interpretation not null,
  created_at timestamptz not null default now()
);
create index if not exists edoslmis_micro_sensitivity_results_tenant_idx on edoslmis_micro_sensitivity_results(tenant_id);
create index if not exists edoslmis_micro_sensitivity_results_isolate_idx on edoslmis_micro_sensitivity_results(isolate_id);

-- ---------------------------------------------------------------------------
-- Molecular / PCR runs
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_molecular_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  branch_id uuid references edoshms_branches(id),
  order_test_id uuid not null references edoslmis_order_tests(id) on delete cascade,
  specimen_id uuid references edoslmis_specimens(id),
  equipment_id uuid references edoslmis_equipment(id),
  assay_name varchar(200) not null,
  status edoslmis_molecular_run_status not null default 'pending',
  performed_by uuid references edoshms_user_profiles(id),
  run_at timestamptz not null default now(),
  finalized_by uuid references edoshms_user_profiles(id),
  finalized_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists edoslmis_molecular_runs_tenant_idx on edoslmis_molecular_runs(tenant_id);
create index if not exists edoslmis_molecular_runs_order_test_idx on edoslmis_molecular_runs(order_test_id);
create index if not exists edoslmis_molecular_runs_status_idx on edoslmis_molecular_runs(status);
create trigger edoslmis_trg_molecular_runs_updated_at
  before update on edoslmis_molecular_runs
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Molecular targets (per-gene Ct values / qualitative call within a run)
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_molecular_targets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  run_id uuid not null references edoslmis_molecular_runs(id) on delete cascade,
  target_name varchar(150) not null,
  ct_value numeric(6,2),
  result edoslmis_molecular_result not null default 'indeterminate',
  created_at timestamptz not null default now()
);
create index if not exists edoslmis_molecular_targets_tenant_idx on edoslmis_molecular_targets(tenant_id);
create index if not exists edoslmis_molecular_targets_run_idx on edoslmis_molecular_targets(run_id);

-- ---------------------------------------------------------------------------
-- Permission grant
-- ---------------------------------------------------------------------------
update edoshms_roles
set permissions = permissions || '["edoslmis.microbiology.manage"]'::jsonb
where tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87'
  and code = 'lab_manager'
  and not (permissions @> '["edoslmis.microbiology.manage"]'::jsonb);

-- ---------------------------------------------------------------------------
-- RLS — catalogs readable/writable by catalog managers; case data writable by
-- anyone with result-entry rights (technologists/scientists/lab managers).
-- ---------------------------------------------------------------------------
alter table edoslmis_micro_organisms enable row level security;
create policy edoslmis_micro_organisms_select on edoslmis_micro_organisms
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_micro_organisms_write on edoslmis_micro_organisms
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_has_permission('edoslmis.microbiology.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_has_permission('edoslmis.microbiology.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_micro_antibiotics enable row level security;
create policy edoslmis_micro_antibiotics_select on edoslmis_micro_antibiotics
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_micro_antibiotics_write on edoslmis_micro_antibiotics
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_has_permission('edoslmis.microbiology.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.catalog.manage') or edoslmis_has_permission('edoslmis.microbiology.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_micro_cultures enable row level security;
create policy edoslmis_micro_cultures_select on edoslmis_micro_cultures
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_micro_cultures_write on edoslmis_micro_cultures
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_has_permission('edoslmis.microbiology.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_has_permission('edoslmis.microbiology.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_micro_culture_isolates enable row level security;
create policy edoslmis_micro_culture_isolates_select on edoslmis_micro_culture_isolates
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_micro_culture_isolates_write on edoslmis_micro_culture_isolates
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_has_permission('edoslmis.microbiology.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_has_permission('edoslmis.microbiology.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_micro_sensitivity_results enable row level security;
create policy edoslmis_micro_sensitivity_results_select on edoslmis_micro_sensitivity_results
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_micro_sensitivity_results_write on edoslmis_micro_sensitivity_results
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_has_permission('edoslmis.microbiology.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_has_permission('edoslmis.microbiology.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_molecular_runs enable row level security;
create policy edoslmis_molecular_runs_select on edoslmis_molecular_runs
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_molecular_runs_write on edoslmis_molecular_runs
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_has_permission('edoslmis.microbiology.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_has_permission('edoslmis.microbiology.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_molecular_targets enable row level security;
create policy edoslmis_molecular_targets_select on edoslmis_molecular_targets
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_molecular_targets_write on edoslmis_molecular_targets
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_has_permission('edoslmis.microbiology.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_has_permission('edoslmis.microbiology.manage') or edoslmis_is_admin_for(tenant_id))
  );
