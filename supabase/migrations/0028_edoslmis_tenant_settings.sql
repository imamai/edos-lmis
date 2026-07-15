-- EDOS LMIS Phase 8 — tenant settings (branding + clinic info)
-- Additive only. Write access is restricted to tenant/platform admins only
-- (edoslmis_is_admin_for), not any operational permission, since this is
-- account-level configuration (logo/signature/clinic contact info shown on
-- every generated document) rather than day-to-day clinical/ops data.

create table if not exists edoslmis_tenant_settings (
  tenant_id uuid primary key references edoshms_tenants(id),
  clinic_name varchar(200),
  clinic_phone varchar(30),
  clinic_email varchar(150),
  clinic_address text,
  currency_code varchar(3) not null default 'KES',
  logo_path text,
  signature_path text,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

drop trigger if exists edoslmis_trg_tenant_settings_updated_at on edoslmis_tenant_settings;
create trigger edoslmis_trg_tenant_settings_updated_at
  before update on edoslmis_tenant_settings
  for each row execute function edoslmis_set_updated_at();

alter table edoslmis_tenant_settings enable row level security;
drop policy if exists edoslmis_tenant_settings_select on edoslmis_tenant_settings;
create policy edoslmis_tenant_settings_select on edoslmis_tenant_settings
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
drop policy if exists edoslmis_tenant_settings_write on edoslmis_tenant_settings;
create policy edoslmis_tenant_settings_write on edoslmis_tenant_settings
  for all using (
    tenant_id = edoshms_get_tenant_id() and edoslmis_is_admin_for(tenant_id)
  ) with check (
    tenant_id = edoshms_get_tenant_id() and edoslmis_is_admin_for(tenant_id)
  );

-- ---------------------------------------------------------------------------
-- Branding storage: public-read bucket, objects keyed "{tenant_id}/logo..."
-- or "{tenant_id}/signature...". Public read needs no policy (public
-- buckets serve GETs unauthenticated); writes are restricted to that
-- tenant's admins, matching the table's write policy above.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('edoslmis-branding', 'edoslmis-branding', true)
on conflict (id) do nothing;

drop policy if exists edoslmis_branding_write on storage.objects;
create policy edoslmis_branding_write on storage.objects
  for all using (
    bucket_id = 'edoslmis-branding'
    and (storage.foldername(name))[1] = edoshms_get_tenant_id()::text
    and edoslmis_is_admin_for(edoshms_get_tenant_id())
  ) with check (
    bucket_id = 'edoslmis-branding'
    and (storage.foldername(name))[1] = edoshms_get_tenant_id()::text
    and edoslmis_is_admin_for(edoshms_get_tenant_id())
  );
