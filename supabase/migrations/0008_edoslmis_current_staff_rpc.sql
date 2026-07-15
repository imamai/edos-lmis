-- EDOS LMIS Phase 1 — current-staff resolver
-- edoshms_user_profiles/edoshms_branches/edoshms_roles have RLS enabled but no
-- SELECT policies, so a user-session client (correct, RLS-respecting access)
-- gets zero rows even for its own profile. Rather than add policies to the
-- shared edoshms_* tables (out of scope, could affect the HMS app), resolve
-- identity through a SECURITY DEFINER function, same pattern as the existing
-- edoshms_get_tenant_id()-style helpers.

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
  where p.id = auth.uid();
$$;

grant execute on function edoslmis_get_current_staff() to authenticated;
