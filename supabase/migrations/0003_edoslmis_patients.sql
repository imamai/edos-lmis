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
