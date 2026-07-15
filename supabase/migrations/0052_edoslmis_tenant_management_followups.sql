-- EDOS LMIS Phase 14 — tenant management follow-ups: auto-generated tenant
-- code, edit/deactivate/delete tenant, list a tenant's admins (so a platform
-- admin can reset a locked-out login's password — the actual reset is done
-- via the Supabase Auth Admin API from server code, see
-- lib/actions/tenant-admin.ts, since there's no SQL equivalent for updating a
-- login's password).
--
-- edoslmis_create_tenant and edoslmis_list_tenants (0051) both change shape
-- here (dropped/added columns), so each is dropped before being recreated —
-- 0051 is left untouched per this repo's additive-migrations convention.

-- ---------------------------------------------------------------------------
-- edoslmis_list_tenant_admins(): read-only, platform-admin-only. Lists a
-- tenant's admin accounts so the UI can offer a password reset per person.
-- SECURITY DEFINER since edoshms_user_profiles has RLS enabled with no
-- SELECT policy for `authenticated` (same reasoning as edoslmis_list_tenants
-- reading edoshms_tenants in 0051).
-- ---------------------------------------------------------------------------
create or replace function edoslmis_list_tenant_admins(p_tenant_id uuid)
returns table (
  id uuid,
  first_name text,
  last_name text,
  is_active boolean
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select p.id, p.first_name, p.last_name, p.is_active
  from edoshms_user_profiles p
  where edoshms_is_platform_admin()
    and p.tenant_id = p_tenant_id
    and p.is_tenant_admin = true
    and p.deleted_at is null
  order by p.first_name, p.last_name;
$$;

grant execute on function edoslmis_list_tenant_admins(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- edoslmis_create_tenant(): now auto-generates `code` from `name` (slugified,
-- deduped with a numeric suffix on collision) instead of taking it as input —
-- one less thing for a platform admin to make up on the spot. Signature
-- drops p_code, so the 0051 version must be dropped first.
-- ---------------------------------------------------------------------------
drop function if exists edoslmis_create_tenant(text, text, text, text, text, uuid, text, text, text);

create or replace function edoslmis_create_tenant(
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
  v_base_code text;
  v_code text;
  v_suffix int := 1;
  v_suffix_text text;
begin
  if not edoshms_is_platform_admin() then
    raise exception 'Not authorized to create tenants';
  end if;

  if p_name is null or trim(p_name) = '' then
    raise exception 'Tenant name is required';
  end if;
  if p_branch_code is null or trim(p_branch_code) = '' or p_branch_name is null or trim(p_branch_name) = '' then
    raise exception 'Branch code and name are required';
  end if;
  if p_admin_user_id is null or p_admin_first_name is null or trim(p_admin_first_name) = ''
     or p_admin_last_name is null or trim(p_admin_last_name) = '' then
    raise exception 'First admin name is required';
  end if;

  -- edoshms_tenants.code is varchar(20) — cap the slugified base at 17 chars
  -- so there's always room left for a "-N" collision suffix.
  v_base_code := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
  v_base_code := trim(both '-' from left(v_base_code, 17));
  if v_base_code = '' then v_base_code := 'tenant'; end if;
  v_code := v_base_code;
  while exists (select 1 from edoshms_tenants where code = v_code) loop
    v_suffix := v_suffix + 1;
    v_suffix_text := '-' || v_suffix;
    v_code := left(v_base_code, 20 - length(v_suffix_text)) || v_suffix_text;
  end loop;

  insert into edoshms_tenants (code, name, legal_name)
  values (v_code, trim(p_name), nullif(trim(p_legal_name), ''))
  returning id into v_tenant_id;

  -- edoshms_branches.code length isn't known to this repo either — cap
  -- defensively at the same 20 chars rather than trust free-typed input.
  insert into edoshms_branches (tenant_id, code, name, is_main, created_by)
  values (v_tenant_id, left(trim(p_branch_code), 20), trim(p_branch_name), true, auth.uid())
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

grant execute on function edoslmis_create_tenant(text, text, text, text, uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- edoslmis_update_tenant(): edit a tenant's core identity fields. Changing
-- `code` is re-validated for uniqueness and rejected outright on conflict
-- (unlike creation, edits don't silently auto-suffix — an admin editing a
-- code typed a specific value on purpose).
-- ---------------------------------------------------------------------------
create or replace function edoslmis_update_tenant(
  p_tenant_id uuid,
  p_name text,
  p_legal_name text,
  p_code text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not edoshms_is_platform_admin() then
    raise exception 'Not authorized to edit tenants';
  end if;
  if p_name is null or trim(p_name) = '' or p_code is null or trim(p_code) = '' then
    raise exception 'Tenant name and code are required';
  end if;
  if exists (select 1 from edoshms_tenants where code = trim(p_code) and id <> p_tenant_id) then
    raise exception 'Tenant code "%" is already in use', trim(p_code);
  end if;

  update edoshms_tenants
    set name = trim(p_name), legal_name = nullif(trim(p_legal_name), ''), code = trim(p_code)
    where id = p_tenant_id;

  if not found then
    raise exception 'Tenant not found';
  end if;
end;
$$;

grant execute on function edoslmis_update_tenant(uuid, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- edoslmis_set_tenant_active(): deactivating a tenant marks it (deleted_at)
-- and — since edoslmis_get_current_staff() only ever checks a *profile's*
-- own is_active/deleted_at, never the parent tenant's — also flips every one
-- of its staff profiles to is_active = false so deactivation actually blocks
-- login tenant-wide, not just cosmetically in this list. Reactivating only
-- clears the tenant's own deleted_at; it deliberately does NOT bulk-reinstate
-- staff, since some may have been individually deactivated on purpose before
-- the tenant-level deactivation — reinstate specific staff via the tenant's
-- own Staff page after reactivating.
-- ---------------------------------------------------------------------------
create or replace function edoslmis_set_tenant_active(p_tenant_id uuid, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not edoshms_is_platform_admin() then
    raise exception 'Not authorized to change tenant status';
  end if;

  if not exists (select 1 from edoshms_tenants where id = p_tenant_id) then
    raise exception 'Tenant not found';
  end if;

  if p_is_active then
    update edoshms_tenants set deleted_at = null where id = p_tenant_id;
  else
    update edoshms_tenants set deleted_at = now() where id = p_tenant_id;
    update edoshms_user_profiles set is_active = false where tenant_id = p_tenant_id;
  end if;
end;
$$;

grant execute on function edoslmis_set_tenant_active(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- edoslmis_delete_tenant(): hard delete. Every tenant created through this
-- app already owns a branch and an admin profile (edoslmis_create_tenant
-- above), and those — like every other edoshms_*/edoslmis_* table with a
-- tenant_id — reference edoshms_tenants without ON DELETE CASCADE, so this
-- will only actually succeed for a tenant with no branches, staff, or any
-- other dependent data (e.g. one created by mistake). Any real, in-use
-- tenant will hit a foreign_key_violation, caught below and turned into a
-- clear message — deactivate instead of delete for anything with real data.
-- This function deliberately does not attempt to cascade-delete a tenant's
-- data itself: that graph spans clinical/financial tables this module
-- doesn't own or fully enumerate, and getting it wrong is irreversible.
-- ---------------------------------------------------------------------------
create or replace function edoslmis_delete_tenant(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not edoshms_is_platform_admin() then
    raise exception 'Not authorized to delete tenants';
  end if;

  delete from edoshms_tenants where id = p_tenant_id;
  if not found then
    raise exception 'Tenant not found';
  end if;
exception
  when foreign_key_violation then
    raise exception 'This tenant still has branches, staff, or other data and cannot be deleted — deactivate it instead.';
end;
$$;

grant execute on function edoslmis_delete_tenant(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- edoslmis_list_tenants(): add deleted_at (deactivation) and legal_name (so
-- the edit-tenant form can be pre-filled without blanking it on save).
-- Return columns changed, so drop before recreate.
-- ---------------------------------------------------------------------------
drop function if exists edoslmis_list_tenants();

create function edoslmis_list_tenants()
returns table (
  id uuid,
  code text,
  name text,
  legal_name text,
  status text,
  facility_type text,
  created_at timestamptz,
  deleted_at timestamptz,
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
    t.legal_name,
    t.status::text,
    t.facility_type::text,
    t.created_at,
    t.deleted_at,
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

-- Force PostgREST to pick up the functions above immediately, rather than
-- waiting for its own change-detection cycle (which is what produced
-- "Could not find the function ... in the schema cache" errors when calling
-- them right after running this file).
notify pgrst, 'reload schema';
