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
