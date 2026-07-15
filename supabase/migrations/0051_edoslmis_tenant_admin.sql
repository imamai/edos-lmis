-- EDOS LMIS Phase 13 — platform-admin tenant/UI management
-- Adds: a read-only cross-tenant tenant list (for the picker), a tenant
-- creation RPC (tenant + main branch + first admin profile in one
-- transaction), and widens the edoslmis_tenant_settings write policy (+ its
-- storage bucket) so a platform admin can edit any tenant's LMIS
-- branding/settings, not just their own.
-- All new SQL objects live in the edoslmis_ namespace (functions owned by
-- this module), same shape as the one existing precedent for writing into a
-- shared edoshms_* table: edoslmis_create_staff_profile (0032) is an
-- edoslmis-owned SECURITY DEFINER function that inserts into
-- edoshms_user_profiles after re-validating the caller is authorized.
-- edoslmis_create_tenant below follows the same pattern, extended to also
-- insert the tenant's first branch and first admin profile.

create or replace function edoslmis_list_tenants()
returns table (
  id uuid,
  code text,
  name text,
  status text,
  facility_type text,
  created_at timestamptz,
  clinic_name text,
  logo_path text,
  theme_color text,
  settings_updated_at timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    t.id,
    t.code,
    t.name,
    t.status::text,
    t.facility_type::text,
    t.created_at,
    s.clinic_name,
    s.logo_path,
    s.theme_color,
    s.updated_at
  from edoshms_tenants t
  left join edoslmis_tenant_settings s on s.tenant_id = t.id
  where edoshms_is_platform_admin()
  order by t.name;
$$;

grant execute on function edoslmis_list_tenants() to authenticated;

-- ---------------------------------------------------------------------------
-- edoslmis_create_tenant(): platform-admin-only. Creates the tenant row, a
-- main branch, and the first admin's staff profile in one transaction (the
-- auth.users/login half of the admin account is created first via the
-- Supabase Auth Admin API from server code — see lib/actions/tenant-admin.ts
-- — same two-step order as the existing createStaffUser flow). p_admin_user_id
-- is the id of that already-created auth user; the caller rolls it back if
-- this RPC raises.
-- facility_type/status are left at their table defaults ('medical_centre'/
-- 'trial') rather than accepting caller-supplied enum text, since this
-- repo doesn't own/track the full edoshms facility_type/tenant_status enum
-- label sets and a bad cast should not be how that's discovered.
-- ---------------------------------------------------------------------------
create or replace function edoslmis_create_tenant(
  p_code text,
  p_name text,
  p_legal_name text,
  p_branch_code text,
  p_branch_name text,
  p_admin_user_id uuid,
  p_admin_first_name text,
  p_admin_last_name text,
  p_admin_phone text default null
)
returns table (tenant_id uuid, branch_id uuid)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tenant_id uuid;
  v_branch_id uuid;
begin
  if not edoshms_is_platform_admin() then
    raise exception 'Not authorized to create tenants';
  end if;

  if p_code is null or trim(p_code) = '' or p_name is null or trim(p_name) = '' then
    raise exception 'Tenant code and name are required';
  end if;
  if p_branch_code is null or trim(p_branch_code) = '' or p_branch_name is null or trim(p_branch_name) = '' then
    raise exception 'Branch code and name are required';
  end if;
  if p_admin_user_id is null or p_admin_first_name is null or trim(p_admin_first_name) = ''
     or p_admin_last_name is null or trim(p_admin_last_name) = '' then
    raise exception 'First admin name is required';
  end if;

  insert into edoshms_tenants (code, name, legal_name)
  values (trim(p_code), trim(p_name), nullif(trim(p_legal_name), ''))
  returning id into v_tenant_id;

  insert into edoshms_branches (tenant_id, code, name, is_main, created_by)
  values (v_tenant_id, trim(p_branch_code), trim(p_branch_name), true, auth.uid())
  returning id into v_branch_id;

  insert into edoshms_user_profiles (
    id, tenant_id, branch_id, first_name, last_name, phone,
    is_tenant_admin, is_active, created_by
  ) values (
    p_admin_user_id, v_tenant_id, v_branch_id, trim(p_admin_first_name), trim(p_admin_last_name),
    nullif(trim(coalesce(p_admin_phone, '')), ''), true, true, auth.uid()
  );

  return query select v_tenant_id, v_branch_id;
end;
$$;

grant execute on function edoslmis_create_tenant(text, text, text, text, text, uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Widen edoslmis_tenant_settings write access: a platform admin may now
-- upsert any tenant's row, not just their own tenant's.
-- ---------------------------------------------------------------------------
drop policy if exists edoslmis_tenant_settings_write on edoslmis_tenant_settings;
create policy edoslmis_tenant_settings_write on edoslmis_tenant_settings
  for all using (
    (tenant_id = edoshms_get_tenant_id() and edoslmis_is_admin_for(tenant_id))
    or edoshms_is_platform_admin()
  ) with check (
    (tenant_id = edoshms_get_tenant_id() and edoslmis_is_admin_for(tenant_id))
    or edoshms_is_platform_admin()
  );

-- ---------------------------------------------------------------------------
-- Widen branding storage writes the same way: a platform admin may upload
-- into any tenant's folder in the edoslmis-branding bucket.
-- ---------------------------------------------------------------------------
drop policy if exists edoslmis_branding_write on storage.objects;
create policy edoslmis_branding_write on storage.objects
  for all using (
    bucket_id = 'edoslmis-branding'
    and (
      ((storage.foldername(name))[1] = edoshms_get_tenant_id()::text and edoslmis_is_admin_for(edoshms_get_tenant_id()))
      or edoshms_is_platform_admin()
    )
  ) with check (
    bucket_id = 'edoslmis-branding'
    and (
      ((storage.foldername(name))[1] = edoshms_get_tenant_id()::text and edoslmis_is_admin_for(edoshms_get_tenant_id()))
      or edoshms_is_platform_admin()
    )
  );
