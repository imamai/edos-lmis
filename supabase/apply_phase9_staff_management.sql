-- EDOS LMIS Phase 9 — staff management (role assignment only)
-- edoshms_user_profiles / edoshms_roles / edoshms_user_roles have RLS enabled
-- but no SELECT policy for session clients (same gap noted in
-- 0008_edoslmis_current_staff_rpc.sql), and this repo deliberately never adds
-- policies to those shared HMS tables. So, same as 0008, identity/role data
-- is exposed through SECURITY DEFINER RPCs, each independently re-checking
-- the caller is a tenant/platform admin before returning or writing anything
-- (the app layer also gates the /staff page, but these RPCs don't rely on
-- that alone). This never creates a login — only assigns/removes roles for
-- staff who already have a profile in this tenant.

create or replace function edoslmis_list_staff_with_roles()
returns table (
  user_id uuid,
  first_name text,
  last_name text,
  staff_category text,
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
    and edoslmis_is_admin_for(p.tenant_id)
  order by p.first_name, p.last_name;
$$;

grant execute on function edoslmis_list_staff_with_roles() to authenticated;

create or replace function edoslmis_list_tenant_roles()
returns table (
  id uuid,
  code text,
  name text,
  description text,
  permissions jsonb
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select r.id, r.code, r.name, r.description, r.permissions
  from edoshms_roles r
  where r.tenant_id = edoshms_get_tenant_id()
    and r.is_active = true
    and edoslmis_is_admin_for(r.tenant_id)
  order by r.name;
$$;

grant execute on function edoslmis_list_tenant_roles() to authenticated;

create or replace function edoslmis_assign_staff_role(
  p_user_id uuid,
  p_role_id uuid,
  p_branch_id uuid default null
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
    raise exception 'Not authorized to assign staff roles';
  end if;

  if not exists (select 1 from edoshms_user_profiles where id = p_user_id and tenant_id = v_tenant_id) then
    raise exception 'Staff member not found in this tenant';
  end if;

  if not exists (select 1 from edoshms_roles where id = p_role_id and tenant_id = v_tenant_id) then
    raise exception 'Role not found in this tenant';
  end if;

  insert into edoshms_user_roles (tenant_id, user_id, role_id, branch_id, is_active)
  values (v_tenant_id, p_user_id, p_role_id, p_branch_id, true)
  on conflict do nothing;
end;
$$;

grant execute on function edoslmis_assign_staff_role(uuid, uuid, uuid) to authenticated;

create or replace function edoslmis_set_staff_role_active(
  p_user_role_id uuid,
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
    raise exception 'Not authorized to change staff role assignments';
  end if;

  update edoshms_user_roles
    set is_active = p_is_active
    where id = p_user_role_id and tenant_id = v_tenant_id;

  if not found then
    raise exception 'Role assignment not found in this tenant';
  end if;
end;
$$;

grant execute on function edoslmis_set_staff_role_active(uuid, boolean) to authenticated;
