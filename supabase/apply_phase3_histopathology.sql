-- EDOS LMIS Phase 3 — histopathology: grossing, blocks, slides, microscopic diagnosis
-- Finalized diagnoses feed edoslmis_result_entries, reusing the existing
-- verify -> release pipeline rather than a parallel sign-off mechanism.

do $$ begin
  create type edoslmis_histo_case_status as enum ('received','grossed','processing','microscopy','finalized');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_histo_specimen_type as enum ('biopsy','resection','cytology','frozen_section');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Cases
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_histo_cases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  branch_id uuid references edoshms_branches(id),
  order_test_id uuid not null references edoslmis_order_tests(id) on delete cascade,
  specimen_id uuid references edoslmis_specimens(id),
  specimen_type edoslmis_histo_specimen_type not null default 'biopsy',
  clinical_history text,
  gross_description text,
  number_of_pieces integer not null default 1,
  status edoslmis_histo_case_status not null default 'received',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_test_id)
);
create index if not exists edoslmis_histo_cases_tenant_idx on edoslmis_histo_cases(tenant_id);
create index if not exists edoslmis_histo_cases_status_idx on edoslmis_histo_cases(status);
create trigger edoslmis_trg_histo_cases_updated_at
  before update on edoslmis_histo_cases
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Tissue blocks (cassettes)
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_histo_blocks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  case_id uuid not null references edoslmis_histo_cases(id) on delete cascade,
  block_number varchar(30) not null,
  tissue_description text,
  created_at timestamptz not null default now()
);
create index if not exists edoslmis_histo_blocks_tenant_idx on edoslmis_histo_blocks(tenant_id);
create index if not exists edoslmis_histo_blocks_case_idx on edoslmis_histo_blocks(case_id);

-- ---------------------------------------------------------------------------
-- Slides (per block, one or more stains)
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_histo_slides (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  block_id uuid not null references edoslmis_histo_blocks(id) on delete cascade,
  slide_number varchar(30) not null,
  stain_type varchar(60) not null default 'H&E',
  created_at timestamptz not null default now()
);
create index if not exists edoslmis_histo_slides_tenant_idx on edoslmis_histo_slides(tenant_id);
create index if not exists edoslmis_histo_slides_block_idx on edoslmis_histo_slides(block_id);

-- ---------------------------------------------------------------------------
-- Microscopic diagnosis
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_histo_diagnoses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  case_id uuid not null references edoslmis_histo_cases(id) on delete cascade,
  microscopic_description text not null,
  diagnosis text not null,
  icd_o_code varchar(20),
  margins_status varchar(100),
  signed_by uuid references edoshms_user_profiles(id),
  signed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (case_id)
);
create index if not exists edoslmis_histo_diagnoses_tenant_idx on edoslmis_histo_diagnoses(tenant_id);

-- ---------------------------------------------------------------------------
-- Permission grant
-- ---------------------------------------------------------------------------
update edoshms_roles
set permissions = permissions || '["edoslmis.histopathology.manage"]'::jsonb
where tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87'
  and code = 'lab_manager'
  and not (permissions @> '["edoslmis.histopathology.manage"]'::jsonb);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table edoslmis_histo_cases enable row level security;
create policy edoslmis_histo_cases_select on edoslmis_histo_cases
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_histo_cases_write on edoslmis_histo_cases
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_has_permission('edoslmis.histopathology.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_has_permission('edoslmis.histopathology.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_histo_blocks enable row level security;
create policy edoslmis_histo_blocks_select on edoslmis_histo_blocks
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_histo_blocks_write on edoslmis_histo_blocks
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_has_permission('edoslmis.histopathology.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_has_permission('edoslmis.histopathology.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_histo_slides enable row level security;
create policy edoslmis_histo_slides_select on edoslmis_histo_slides
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_histo_slides_write on edoslmis_histo_slides
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_has_permission('edoslmis.histopathology.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_has_permission('edoslmis.histopathology.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_histo_diagnoses enable row level security;
create policy edoslmis_histo_diagnoses_select on edoslmis_histo_diagnoses
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_histo_diagnoses_write on edoslmis_histo_diagnoses
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_has_permission('edoslmis.histopathology.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.result.enter') or edoslmis_has_permission('edoslmis.histopathology.manage') or edoslmis_is_admin_for(tenant_id))
  );
