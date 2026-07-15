-- EDOS LMIS Phase 2 — internal quality control with Westgard multirule evaluation

do $$ begin
  create type edoslmis_qc_level as enum ('level1','level2','level3');
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_qc_status as enum ('accepted','warning','rejected');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- QC materials (control lots): target mean/SD per test + level + lot
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_qc_materials (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  branch_id uuid references edoshms_branches(id),
  test_id uuid not null references edoslmis_tests(id),
  level edoslmis_qc_level not null,
  lot_number varchar(60) not null,
  manufacturer varchar(150),
  expiry_date date,
  target_mean numeric(14,4) not null,
  target_sd numeric(14,4) not null,
  unit varchar(30),
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, test_id, level, lot_number)
);
create index if not exists edoslmis_qc_materials_tenant_idx on edoslmis_qc_materials(tenant_id);
create index if not exists edoslmis_qc_materials_test_idx on edoslmis_qc_materials(test_id);
create trigger edoslmis_trg_qc_materials_updated_at
  before update on edoslmis_qc_materials
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- QC runs: one control-value observation, auto-evaluated against Westgard
-- multirule on insert (1_2s, 1_3s, 2_2s, r_4s, 4_1s, 10x).
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_qc_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  branch_id uuid references edoshms_branches(id),
  material_id uuid not null references edoslmis_qc_materials(id) on delete cascade,
  equipment_id uuid references edoslmis_equipment(id),
  value numeric(14,4) not null,
  z_score numeric(8,4),
  status edoslmis_qc_status not null default 'accepted',
  violated_rules jsonb not null default '[]'::jsonb,
  comments text,
  performed_by uuid references edoshms_user_profiles(id),
  run_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists edoslmis_qc_runs_tenant_idx on edoslmis_qc_runs(tenant_id);
create index if not exists edoslmis_qc_runs_material_idx on edoslmis_qc_runs(material_id, run_at desc);
create index if not exists edoslmis_qc_runs_status_idx on edoslmis_qc_runs(status);

-- ---------------------------------------------------------------------------
-- Westgard multirule evaluation. Runs as SECURITY INVOKER (default) so reads
-- of prior runs stay subject to the caller's own RLS grants.
-- R_4s is approximated within a single level+lot series (current vs previous
-- run) rather than the textbook paired-level comparison, since cross-level
-- pairing would require matching runs performed in the same analytical run.
-- ---------------------------------------------------------------------------
create or replace function edoslmis_evaluate_qc_run()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  v_mean numeric;
  v_sd numeric;
  v_z numeric;
  v_rules jsonb := '[]'::jsonb;
  v_status edoslmis_qc_status := 'accepted';
  v_recent numeric[];
begin
  select target_mean, target_sd into v_mean, v_sd
  from edoslmis_qc_materials where id = new.material_id;

  if v_sd is null or v_sd = 0 then
    new.z_score := null;
    new.status := 'accepted';
    new.violated_rules := '[]'::jsonb;
    return new;
  end if;

  v_z := (new.value - v_mean) / v_sd;
  new.z_score := v_z;

  if abs(v_z) >= 3 then
    v_rules := v_rules || '["1_3s"]'::jsonb;
    v_status := 'rejected';
  elsif abs(v_z) >= 2 then
    v_rules := v_rules || '["1_2s"]'::jsonb;
    v_status := 'warning';
  end if;

  select array_agg(z_score order by run_at desc) into v_recent
  from (
    select z_score, run_at from edoslmis_qc_runs
    where material_id = new.material_id and z_score is not null
    order by run_at desc
    limit 9
  ) s;

  if v_recent is not null and array_length(v_recent, 1) >= 1 then
    if abs(v_z) >= 2 and abs(v_recent[1]) >= 2 and sign(v_z) = sign(v_recent[1]) then
      v_rules := v_rules || '["2_2s"]'::jsonb;
      v_status := 'rejected';
    end if;

    if abs(v_z - v_recent[1]) >= 4 then
      v_rules := v_rules || '["r_4s"]'::jsonb;
      v_status := 'rejected';
    end if;
  end if;

  if v_recent is not null and array_length(v_recent, 1) >= 3 then
    if abs(v_z) >= 1 and abs(v_recent[1]) >= 1 and abs(v_recent[2]) >= 1 and abs(v_recent[3]) >= 1
       and sign(v_z) = sign(v_recent[1]) and sign(v_z) = sign(v_recent[2]) and sign(v_z) = sign(v_recent[3])
    then
      v_rules := v_rules || '["4_1s"]'::jsonb;
      v_status := 'rejected';
    end if;
  end if;

  if v_recent is not null and array_length(v_recent, 1) >= 9 and sign(v_z) <> 0 then
    if (select bool_and(sign(z) = sign(v_z)) from unnest(v_recent[1:9]) as z) then
      v_rules := v_rules || '["10x"]'::jsonb;
      v_status := 'rejected';
    end if;
  end if;

  new.status := v_status;
  new.violated_rules := v_rules;
  return new;
end;
$$;

create trigger edoslmis_trg_evaluate_qc_run
  before insert on edoslmis_qc_runs
  for each row execute function edoslmis_evaluate_qc_run();

-- ---------------------------------------------------------------------------
-- Permission grant
-- ---------------------------------------------------------------------------
update edoshms_roles
set permissions = permissions || '["edoslmis.qc.manage"]'::jsonb
where tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87'
  and code = 'lab_manager'
  and not (permissions @> '["edoslmis.qc.manage"]'::jsonb);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table edoslmis_qc_materials enable row level security;
create policy edoslmis_qc_materials_select on edoslmis_qc_materials
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_qc_materials_write on edoslmis_qc_materials
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.qc.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.qc.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_qc_runs enable row level security;
create policy edoslmis_qc_runs_select on edoslmis_qc_runs
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_qc_runs_insert on edoslmis_qc_runs
  for insert with check (
    tenant_id = edoshms_get_tenant_id()
    and (
      edoslmis_has_permission('edoslmis.qc.manage')
      or edoslmis_has_permission('edoslmis.result.enter')
      or edoslmis_is_admin_for(tenant_id)
    )
  );
-- EDOS LMIS Phase 2 — seed QC materials + a demonstration run history
-- (includes one deliberate out-of-control point so the Westgard engine has
-- something to flag on first load).

insert into edoslmis_qc_materials (tenant_id, branch_id, test_id, level, lot_number, manufacturer, expiry_date, target_mean, target_sd, unit)
select '5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', t.id, v.level::edoslmis_qc_level, v.lot, v.manu, v.expiry::date, v.mean, v.sd, v.unit
from (values
  ('RBS', 'level1', 'QC-GLU-L1-2601', 'Bio-Rad Liquichek', '2027-01-31', 5.5, 0.2, 'mmol/L'),
  ('RBS', 'level2', 'QC-GLU-L2-2601', 'Bio-Rad Liquichek', '2027-01-31', 15.0, 0.5, 'mmol/L'),
  ('ESR', 'level1', 'QC-ESR-L1-2601', 'Streck', '2026-12-31', 10.0, 1.0, 'mm/hr')
) as v(test_code, level, lot, manu, expiry, mean, sd, unit)
join edoslmis_tests t on t.tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and t.code = v.test_code
on conflict (tenant_id, test_id, level, lot_number) do nothing;

do $$
declare
  v_rbs_l1 uuid;
  v_rbs_l2 uuid;
  v_esr_l1 uuid;
begin
  if exists (select 1 from edoslmis_qc_runs where tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87') then
    return;
  end if;

  select id into v_rbs_l1 from edoslmis_qc_materials
    where tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and lot_number = 'QC-GLU-L1-2601';
  select id into v_rbs_l2 from edoslmis_qc_materials
    where tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and lot_number = 'QC-GLU-L2-2601';
  select id into v_esr_l1 from edoslmis_qc_materials
    where tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87' and lot_number = 'QC-ESR-L1-2601';

  insert into edoslmis_qc_runs (tenant_id, branch_id, material_id, value, run_at)
  values
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l1, 5.4, now() - interval '9 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l1, 5.6, now() - interval '8 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l1, 5.5, now() - interval '7 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l1, 5.3, now() - interval '6 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l1, 5.6, now() - interval '5 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l1, 5.4, now() - interval '4 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l1, 5.5, now() - interval '3 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l1, 5.6, now() - interval '2 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l1, 5.5, now() - interval '1 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l1, 6.3, now());

  insert into edoslmis_qc_runs (tenant_id, branch_id, material_id, value, run_at)
  values
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l2, 14.9, now() - interval '4 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l2, 15.2, now() - interval '3 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l2, 15.0, now() - interval '2 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l2, 15.1, now() - interval '1 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_rbs_l2, 14.8, now());

  insert into edoslmis_qc_runs (tenant_id, branch_id, material_id, value, run_at)
  values
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_esr_l1, 9.8, now() - interval '4 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_esr_l1, 10.2, now() - interval '3 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_esr_l1, 10.0, now() - interval '2 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_esr_l1, 9.9, now() - interval '1 days'),
    ('5149e80b-d5a9-4bfa-a1ac-8508c8898c87', 'f201bc43-ea2c-48e1-86ba-6f11ffce76b0', v_esr_l1, 10.1, now());
end $$;
