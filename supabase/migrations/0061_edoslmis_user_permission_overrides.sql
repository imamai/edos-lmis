-- EDOS LMIS — per-user custom permission overrides
--
-- Roles bundle permissions, but a tenant admin creating a new staff account
-- often wants to grant a specific individual a-la-carte capability without
-- either creating a whole new role for one person or handing them a broader
-- existing role. This table is a per-user, additive grant list: holding a
-- permission row here grants that permission on top of whatever the user's
-- roles already grant (checking a box adds access — this never revokes a
-- permission a role already grants, which keeps the precedence rule simple
-- and avoids accidentally locking someone out via an unchecked box).
--
-- edoshms_user_profiles/edoshms_roles/edoshms_user_roles are shared HMS
-- tables this repo never adds policies to directly (see 0008, 0029) — this
-- is a new edoslmis_-owned table instead, same pattern as every other
-- extension in this repo, with a normal FK to edoshms_user_profiles (FKs to
-- shared tables are fine, e.g. edoslmis_stock_transactions.performed_by;
-- it's CREATE TABLE/RLS on the shared tables themselves that's avoided).

create table if not exists edoslmis_user_permission_overrides (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references edoshms_tenants(id),
  user_id uuid not null references edoshms_user_profiles(id),
  permission text not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id, permission)
);
create index if not exists edoslmis_user_permission_overrides_user_idx on edoslmis_user_permission_overrides(tenant_id, user_id);

alter table edoslmis_user_permission_overrides enable row level security;
create policy edoslmis_user_permission_overrides_select on edoslmis_user_permission_overrides
  for select using (tenant_id = edoshms_get_tenant_id() or edoshms_is_platform_admin());
create policy edoslmis_user_permission_overrides_write on edoslmis_user_permission_overrides
  for all using (
    tenant_id = edoshms_get_tenant_id() and edoslmis_is_admin_for(tenant_id)
  ) with check (
    tenant_id = edoshms_get_tenant_id() and edoslmis_is_admin_for(tenant_id)
  );

-- Fold overrides into the central permission check (same signature as the
-- original in 0006 — a true replace, not a new overload).
create or replace function edoslmis_has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(edoshms_is_platform_admin(), false)
    or exists (
      select 1
      from edoshms_user_roles ur
      join edoshms_roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and ur.is_active = true
        and (ur.expires_at is null or ur.expires_at > now())
        and r.is_active = true
        and r.permissions ? p_permission
    )
    or exists (
      select 1
      from edoslmis_user_permission_overrides o
      where o.user_id = auth.uid()
        and o.tenant_id = edoshms_get_tenant_id()
        and o.permission = p_permission
    );
$$;

-- Admin-only: replace a user's full set of custom permission overrides in
-- one call (the checkbox form always submits the complete desired state,
-- same "replace all" shape as the checklist UI, rather than incremental
-- add/remove calls).
create or replace function edoslmis_set_user_permission_overrides(
  p_user_id uuid,
  p_permissions text[]
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
    raise exception 'Not authorized to set staff permissions';
  end if;

  if not exists (select 1 from edoshms_user_profiles where id = p_user_id and tenant_id = v_tenant_id) then
    raise exception 'Staff member not found in this tenant';
  end if;

  delete from edoslmis_user_permission_overrides
    where tenant_id = v_tenant_id and user_id = p_user_id;

  if p_permissions is not null and array_length(p_permissions, 1) > 0 then
    insert into edoslmis_user_permission_overrides (tenant_id, user_id, permission, created_by)
    select v_tenant_id, p_user_id, perm, auth.uid()
    from unnest(p_permissions) as perm;
  end if;
end;
$$;

grant execute on function edoslmis_set_user_permission_overrides(uuid, text[]) to authenticated;

-- Extend the staff list RPC to also return each user's custom permission
-- overrides. CREATE OR REPLACE can't change a RETURNS TABLE column list
-- (the OUT-parameter row type is part of the signature, unlike the function
-- body) — adding custom_permissions requires dropping the old 5-column
-- version first.
drop function if exists edoslmis_list_staff_with_roles();
create or replace function edoslmis_list_staff_with_roles()
returns table (
  user_id uuid,
  first_name text,
  last_name text,
  staff_category text,
  roles jsonb,
  custom_permissions jsonb
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
    ) as roles,
    coalesce(
      (
        select jsonb_agg(o.permission order by o.permission)
        from edoslmis_user_permission_overrides o
        where o.user_id = p.id and o.tenant_id = p.tenant_id
      ),
      '[]'::jsonb
    ) as custom_permissions
  from edoshms_user_profiles p
  where p.tenant_id = edoshms_get_tenant_id()
    and edoslmis_is_admin_for(p.tenant_id)
  order by p.first_name, p.last_name;
$$;

grant execute on function edoslmis_list_staff_with_roles() to authenticated;
