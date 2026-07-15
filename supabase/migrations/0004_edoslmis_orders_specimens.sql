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
