-- EDOS LMIS — restore is_active (and the deleted_at filter) to
-- edoslmis_list_staff_with_roles(), lost in 0061.
--
-- 0032 added `is_active boolean` to this function's return columns and
-- filtered out soft-deleted profiles (`p.deleted_at is null`). 0061 needed
-- to add `custom_permissions` and, per its own comment, had to drop the
-- function first since CREATE OR REPLACE can't change a RETURNS TABLE
-- column list — but it was written from an older base and silently dropped
-- both of 0032's changes instead of carrying them forward. Every staff
-- member has been rendering as "Inactive" in the UI since (Badge/toggle in
-- components/staff-active-toggle.tsx reads row.is_active, which came back
-- undefined), and soft-deleted staff could reappear in the list.

drop function if exists edoslmis_list_staff_with_roles();

create or replace function edoslmis_list_staff_with_roles()
returns table (
  user_id uuid,
  first_name text,
  last_name text,
  staff_category text,
  is_active boolean,
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
    and p.deleted_at is null
    and edoslmis_is_admin_for(p.tenant_id)
  order by p.first_name, p.last_name;
$$;

grant execute on function edoslmis_list_staff_with_roles() to authenticated;
