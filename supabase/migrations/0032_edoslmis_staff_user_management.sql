-- EDOS LMIS Phase 10c — staff user management (create real accounts, not just role grants)
-- Companion to 0029: that migration could only assign roles to staff who
-- already had an edoshms_user_profiles row created by some other process.
-- This migration adds the write path for the profile half of account
-- creation (the auth.users/login half can only be created via the Supabase
-- Auth Admin API from server code, never plain SQL — see lib/actions/staff.ts).
-- Same pattern as every other write this repo makes to the shared edoshms_*
-- tables: a SECURITY DEFINER function that re-validates the caller is an
-- admin for the tenant itself, never trusting a caller-supplied tenant id.

create or replace function edoslmis_create_staff_profile(
  p_user_id uuid,
  p_first_name text,
  p_last_name text,
  p_phone text default null,
  p_staff_category text default null,
  p_branch_id uuid default null,
  p_is_tenant_admin boolean default false
)
returns edoshms_user_profiles
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tenant_id uuid;
  v_row edoshms_user_profiles;
begin
  v_tenant_id := edoshms_get_tenant_id();

  if not edoslmis_is_admin_for(v_tenant_id) then
    raise exception 'Not authorized to create staff accounts';
  end if;

  if p_first_name is null or trim(p_first_name) = '' or p_last_name is null or trim(p_last_name) = '' then
    raise exception 'First and last name are required';
  end if;

  insert into edoshms_user_profiles (
    id, tenant_id, branch_id, first_name, last_name, phone, staff_category,
    is_tenant_admin, is_active, created_by
  ) values (
    p_user_id, v_tenant_id, p_branch_id, p_first_name, p_last_name, p_phone,
    nullif(p_staff_category, '')::public.staff_category,
    coalesce(p_is_tenant_admin, false), true, auth.uid()
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function edoslmis_create_staff_profile(uuid, text, text, text, text, uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Deactivate/reactivate a staff account.
-- ---------------------------------------------------------------------------
create or replace function edoslmis_set_staff_active(
  p_user_id uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tenant_id uuid;
begin
  v_tenant_id := edoshms_get_tenant_id();

  if not edoslmis_is_admin_for(v_tenant_id) then
    raise exception 'Not authorized to change staff account status';
  end if;

  update edoshms_user_profiles
    set is_active = p_is_active
    where id = p_user_id and tenant_id = v_tenant_id;

  if not found then
    raise exception 'Staff member not found in this tenant';
  end if;
end;
$$;

grant execute on function edoslmis_set_staff_active(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- edoslmis_list_staff_with_roles(): add is_active so the UI can show/toggle
-- it, and exclude soft-deleted profiles. Signature (return columns) changes,
-- so drop before recreate.
-- ---------------------------------------------------------------------------
drop function if exists edoslmis_list_staff_with_roles();

create function edoslmis_list_staff_with_roles()
returns table (
  user_id uuid,
  first_name text,
  last_name text,
  staff_category text,
  is_active boolean,
  roles jsonb
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    p.id,
    p.first_name,
    p.last_name,
    p.staff_category,
    p.is_active,
    coalesce(
      (
        select jsonb_agg(jsonb_build_object(
          'user_role_id', ur.id,
          'role_id', r.id,
          'role_code', r.code,
          'role_name', r.name,
          'is_active', ur.is_active
        ) order by r.name)
        from edoshms_user_roles ur
        join edoshms_roles r on r.id = ur.role_id
        where ur.user_id = p.id and ur.tenant_id = p.tenant_id
      ),
      '[]'::jsonb
    ) as roles
  from edoshms_user_profiles p
  where p.tenant_id = edoshms_get_tenant_id()
    and p.deleted_at is null
    and edoslmis_is_admin_for(p.tenant_id)
  order by p.first_name, p.last_name;
$$;

grant execute on function edoslmis_list_staff_with_roles() to authenticated;

-- ---------------------------------------------------------------------------
-- edoslmis_get_current_staff(): require an active, non-deleted profile so
-- deactivating a staff account actually locks them out (lib/auth.ts already
-- redirects to /no-access whenever this RPC returns no row). Return columns
-- are unchanged, so create-or-replace is safe here.
-- ---------------------------------------------------------------------------
create or replace function edoslmis_get_current_staff()
returns table (
  user_id uuid,
  tenant_id uuid,
  branch_id uuid,
  branch_name text,
  first_name text,
  last_name text,
  staff_category text,
  is_platform_admin boolean,
  is_tenant_admin boolean,
  permissions jsonb
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    p.id,
    p.tenant_id,
    p.branch_id,
    b.name,
    p.first_name,
    p.last_name,
    p.staff_category,
    p.is_platform_admin,
    p.is_tenant_admin,
    coalesce(
      (
        select jsonb_agg(distinct perm)
        from edoshms_user_roles ur
        join edoshms_roles r on r.id = ur.role_id
        cross join lateral jsonb_array_elements_text(r.permissions) as perm
        where ur.user_id = p.id
          and ur.is_active = true
          and (ur.expires_at is null or ur.expires_at > now())
          and r.is_active = true
      ),
      '[]'::jsonb
    ) as permissions
  from edoshms_user_profiles p
  left join edoshms_branches b on b.id = p.branch_id
  where p.id = auth.uid()
    and p.is_active = true
    and p.deleted_at is null;
$$;

grant execute on function edoslmis_get_current_staff() to authenticated;
