-- EDOS LMIS Phase 2 — billing / invoicing / payments / insurance claims
-- Fully independent of edoshms_* billing (per architecture decision). Links to
-- edoslmis_orders / edoslmis_patients / edoslmis_order_tests only.

do $$ begin
  create type edoslmis_payer_type as enum (
    'self_pay','insurance','corporate','nhif','sha','referral'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_invoice_status as enum (
    'draft','issued','partially_paid','paid','cancelled','written_off'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_payment_method as enum (
    'cash','mpesa','card','bank_transfer','cheque','insurance','nhif','sha'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type edoslmis_claim_status as enum (
    'pending','submitted','approved','rejected','paid'
  );
exception when duplicate_object then null; end $$;

create sequence if not exists edoslmis_invoice_number_seq;
create or replace function edoslmis_generate_invoice_number()
returns text
language sql
as $$
  select 'INV-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('edoslmis_invoice_number_seq')::text, 6, '0');
$$;

-- ---------------------------------------------------------------------------
-- Invoices
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  branch_id uuid references edoshms_branches(id),
  invoice_number varchar(40) not null,
  patient_id uuid not null references edoslmis_patients(id),
  order_id uuid references edoslmis_orders(id),
  payer_type edoslmis_payer_type not null default 'self_pay',
  payer_name varchar(200),
  subtotal numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0,
  balance_due numeric(14,2) generated always as (total_amount - amount_paid) stored,
  status edoslmis_invoice_status not null default 'draft',
  issued_at timestamptz,
  due_date date,
  cancellation_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, invoice_number),
  unique (order_id)
);
create index if not exists edoslmis_invoices_tenant_idx on edoslmis_invoices(tenant_id);
create index if not exists edoslmis_invoices_patient_idx on edoslmis_invoices(patient_id);
create index if not exists edoslmis_invoices_status_idx on edoslmis_invoices(status);
create trigger edoslmis_trg_invoices_updated_at
  before update on edoslmis_invoices
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Invoice line items
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_invoice_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  invoice_id uuid not null references edoslmis_invoices(id) on delete cascade,
  order_test_id uuid references edoslmis_order_tests(id),
  description varchar(250) not null,
  quantity numeric(10,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists edoslmis_invoice_items_tenant_idx on edoslmis_invoice_items(tenant_id);
create index if not exists edoslmis_invoice_items_invoice_idx on edoslmis_invoice_items(invoice_id);

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  invoice_id uuid not null references edoslmis_invoices(id),
  amount numeric(14,2) not null,
  payment_method edoslmis_payment_method not null,
  reference_number varchar(100),
  notes text,
  received_by uuid references edoshms_user_profiles(id),
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists edoslmis_payments_tenant_idx on edoslmis_payments(tenant_id);
create index if not exists edoslmis_payments_invoice_idx on edoslmis_payments(invoice_id, paid_at);

-- ---------------------------------------------------------------------------
-- Insurance / NHIF / SHA claims
-- ---------------------------------------------------------------------------
create table if not exists edoslmis_insurance_claims (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  invoice_id uuid not null references edoslmis_invoices(id),
  scheme_name varchar(150) not null,
  policy_number varchar(100),
  claim_number varchar(100),
  status edoslmis_claim_status not null default 'pending',
  submitted_at timestamptz,
  approved_amount numeric(14,2),
  rejection_reason text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists edoslmis_insurance_claims_tenant_idx on edoslmis_insurance_claims(tenant_id);
create index if not exists edoslmis_insurance_claims_invoice_idx on edoslmis_insurance_claims(invoice_id);
create trigger edoslmis_trg_insurance_claims_updated_at
  before update on edoslmis_insurance_claims
  for each row execute function edoslmis_set_updated_at();

-- ---------------------------------------------------------------------------
-- Generate an invoice from an order's line items (atomic, locks the order).
-- ---------------------------------------------------------------------------
create or replace function edoslmis_generate_invoice_for_order(p_order_id uuid)
returns edoslmis_invoices
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tenant_id uuid;
  v_branch_id uuid;
  v_patient_id uuid;
  v_patient_category edoslmis_patient_category;
  v_subtotal numeric(14,2);
  v_invoice_number text;
  v_payer_type edoslmis_payer_type;
  v_invoice edoslmis_invoices;
begin
  select o.tenant_id, o.branch_id, o.patient_id
    into v_tenant_id, v_branch_id, v_patient_id
  from edoslmis_orders o
  where o.id = p_order_id
  for update;

  if not found then
    raise exception 'Order % not found', p_order_id;
  end if;

  if v_tenant_id <> edoshms_get_tenant_id() and not edoshms_is_platform_admin() then
    raise exception 'Not authorized for this tenant';
  end if;

  if not (edoslmis_has_permission('edoslmis.billing.manage') or edoslmis_is_admin_for(v_tenant_id)) then
    raise exception 'Not authorized to generate invoices';
  end if;

  if exists (select 1 from edoslmis_invoices where order_id = p_order_id) then
    raise exception 'An invoice already exists for this order';
  end if;

  select patient_category into v_patient_category from edoslmis_patients where id = v_patient_id;
  v_payer_type := case v_patient_category
    when 'insurance' then 'insurance'
    when 'corporate' then 'corporate'
    else 'self_pay'
  end;

  select coalesce(sum(price), 0) into v_subtotal
  from edoslmis_order_tests
  where order_id = p_order_id;

  v_invoice_number := edoslmis_generate_invoice_number();

  insert into edoslmis_invoices (
    tenant_id, branch_id, invoice_number, patient_id, order_id, payer_type,
    subtotal, total_amount, status, issued_at, created_by
  ) values (
    v_tenant_id, v_branch_id, v_invoice_number, v_patient_id, p_order_id, v_payer_type,
    v_subtotal, v_subtotal, 'issued', now(), auth.uid()
  )
  returning * into v_invoice;

  insert into edoslmis_invoice_items (tenant_id, invoice_id, order_test_id, description, quantity, unit_price, total_amount)
  select v_tenant_id, v_invoice.id, ot.id, t.name, 1, ot.price, ot.price
  from edoslmis_order_tests ot
  join edoslmis_tests t on t.id = ot.test_id
  where ot.order_id = p_order_id;

  return v_invoice;
end;
$$;

grant execute on function edoslmis_generate_invoice_for_order(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Record a payment against an invoice (atomic, locks the invoice).
-- ---------------------------------------------------------------------------
create or replace function edoslmis_record_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_method edoslmis_payment_method,
  p_reference_number text default null,
  p_notes text default null
)
returns edoslmis_payments
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tenant_id uuid;
  v_total_amount numeric(14,2);
  v_amount_paid numeric(14,2);
  v_new_paid numeric(14,2);
  v_row edoslmis_payments;
begin
  select tenant_id, total_amount, amount_paid
    into v_tenant_id, v_total_amount, v_amount_paid
  from edoslmis_invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'Invoice % not found', p_invoice_id;
  end if;

  if v_tenant_id <> edoshms_get_tenant_id() and not edoshms_is_platform_admin() then
    raise exception 'Not authorized for this tenant';
  end if;

  if not (edoslmis_has_permission('edoslmis.billing.manage') or edoslmis_is_admin_for(v_tenant_id)) then
    raise exception 'Not authorized to record payments';
  end if;

  if p_amount <= 0 then
    raise exception 'Payment amount must be positive';
  end if;

  v_new_paid := v_amount_paid + p_amount;

  insert into edoslmis_payments (
    tenant_id, invoice_id, amount, payment_method, reference_number, notes, received_by
  ) values (
    v_tenant_id, p_invoice_id, p_amount, p_payment_method, p_reference_number, p_notes, auth.uid()
  )
  returning * into v_row;

  update edoslmis_invoices
  set amount_paid = v_new_paid,
      status = case
        when v_new_paid >= v_total_amount then 'paid'
        when v_new_paid > 0 then 'partially_paid'
        else status
      end
  where id = p_invoice_id;

  return v_row;
end;
$$;

grant execute on function edoslmis_record_payment(uuid, numeric, edoslmis_payment_method, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Permission grant
-- ---------------------------------------------------------------------------
update edoshms_roles
set permissions = permissions || '["edoslmis.billing.manage"]'::jsonb
where tenant_id = '5149e80b-d5a9-4bfa-a1ac-8508c8898c87'
  and code = 'lab_manager'
  and not (permissions @> '["edoslmis.billing.manage"]'::jsonb);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table edoslmis_invoices enable row level security;
create policy edoslmis_invoices_select on edoslmis_invoices
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_invoices_write on edoslmis_invoices
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.billing.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.billing.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_invoice_items enable row level security;
create policy edoslmis_invoice_items_select on edoslmis_invoice_items
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_invoice_items_insert on edoslmis_invoice_items
  for insert with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.billing.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_payments enable row level security;
create policy edoslmis_payments_select on edoslmis_payments
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_payments_insert on edoslmis_payments
  for insert with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.billing.manage') or edoslmis_is_admin_for(tenant_id))
  );

alter table edoslmis_insurance_claims enable row level security;
create policy edoslmis_insurance_claims_select on edoslmis_insurance_claims
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_insurance_claims_write on edoslmis_insurance_claims
  for all using (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.billing.manage') or edoslmis_is_admin_for(tenant_id))
  ) with check (
    tenant_id = edoshms_get_tenant_id()
    and (edoslmis_has_permission('edoslmis.billing.manage') or edoslmis_is_admin_for(tenant_id))
  );
